const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Pool } = require('pg');

const ROOT = process.cwd();
const DB_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DB_DIR, 'app.db');
const SQLITE = path.join(ROOT, 'tools', 'sqlite3.exe');
const SUPABASE_SCHEMA = path.join(ROOT, 'supabase', 'schema.sql');

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m) {
        const k = m[1];
        let v = m[2];
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

function runSqlite(sql) {
  if (!fs.existsSync(SQLITE)) throw new Error('sqlite3.exe not found in tools/');
  if (!fs.existsSync(DB_DIR)) throw new Error('SQLite data/ directory not found');
  if (!fs.existsSync(DB_PATH)) throw new Error('SQLite DB not found at data/app.db');
  return execFileSync(SQLITE, ['-batch', DB_PATH], { input: sql, encoding: 'utf8' });
}

function getSqliteColumns(table) {
  const out = runSqlite(`.mode json\nPRAGMA table_info(${table});`);
  try {
    const arr = JSON.parse(out);
    return arr.map(c => c.name);
  } catch {
    return [];
  }
}

function getSqliteRows(table) {
  const out = runSqlite(`.mode json\nSELECT * FROM ${table};`);
  try { return JSON.parse(out); } catch { return []; }
}

async function ensureSchema(pool) {
  if (!fs.existsSync(SUPABASE_SCHEMA)) return;
  const sql = fs.readFileSync(SUPABASE_SCHEMA, 'utf8');
  await pool.query(sql);
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function qIdent(id) {
  // Quote identifier to preserve case and special characters
  return '"' + String(id).replace(/"/g, '""') + '"';
}

async function upsertBatch(pool, table, keyCols, rows, allCols) {
  if (rows.length === 0) return 0;
  const cols = allCols.filter(c => Object.prototype.hasOwnProperty.call(rows[0], c));
  if (cols.length === 0) return 0;

  const values = [];
  const params = [];
  let p = 1;
  for (const r of rows) {
    const rowVals = [];
    for (const c of cols) { rowVals.push(`$${p++}`); params.push(r[c] === undefined ? null : r[c]); }
    values.push('(' + rowVals.join(',') + ')');
  }

  const nonKeyCols = cols.filter(c => !keyCols.includes(c));
  const updateSet = nonKeyCols.length
    ? 'DO UPDATE SET ' + nonKeyCols.map(c => `${qIdent(c)} = EXCLUDED.${qIdent(c)}`).join(', ')
    : 'DO NOTHING';

  const sql = `INSERT INTO ${table} (${cols.map(qIdent).join(',')}) VALUES ${values.join(',')}\n` +
              `ON CONFLICT (${keyCols.map(qIdent).join(',')}) ${updateSet};`;

  await pool.query(sql, params);
  return rows.length;
}

function normalizeRow(table, row) {
  const r = { ...row };
  const now = new Date().toISOString();
  const needUpdatedAt = ['users','movies','seat_templates','shows','notification_templates','notification_campaigns'];
  const needCreatedAt = ['users','movies','seat_templates','theatre_schedules','shows','pricing_tiers','profiles','theatres','notification_templates','notification_campaigns'];
  if (needCreatedAt.includes(table)) {
    if (!r.createdAt) r.createdAt = now;
  }
  if (needUpdatedAt.includes(table)) {
    if (!r.updatedAt) r.updatedAt = r.createdAt || now;
  }
  if (table === 'users') {
    if (!r.status) r.status = 'active';
  }
  return r;
}

async function migrate() {
  loadEnv();
  const cs = process.env.DATABASE_URL;
  const driver = (process.env.DB_DRIVER || '').toLowerCase();
  if (!cs) throw new Error('DATABASE_URL not set');
  if (driver !== 'pg') throw new Error('DB_DRIVER must be pg for migration');

  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 4, connectionTimeoutMillis: 10000 });
  pool.on('error', () => {}); // suppress post-termination errors from pooler
  try {
    // 1) Ensure schema exists on Supabase
    await ensureSchema(pool);

    // 2) Table order and conflict keys
    const plan = [
      { table: 'roles', keyCols: ['id'], preferKeys: ['id','name'] },
      { table: 'users', keyCols: ['id'] },
      { table: 'user_roles', keyCols: ['userId','roleId'] },
      { table: 'categories', keyCols: ['id'] },
      { table: 'movies', keyCols: ['id'] },
      { table: 'movie_categories', keyCols: ['movieId','categoryId'] },
      { table: 'theatres', keyCols: ['id'] },
      { table: 'pricing_tiers', keyCols: ['id'] },
      { table: 'theatre_pricing', keyCols: ['theatreId','pricingTierId'] },
      { table: 'seat_templates', keyCols: ['id'] },
      { table: 'theatre_schedules', keyCols: ['id'] },
      { table: 'shows', keyCols: ['id'] },
      { table: 'profiles', keyCols: ['id'] },
      { table: 'tickets', keyCols: ['ticketId'] },
      { table: 'notification_templates', keyCols: ['id'] },
      { table: 'notification_campaigns', keyCols: ['id'] },
      { table: 'notifications', keyCols: ['id'] },
      { table: 'access_logs', keyCols: ['id'] },
      { table: 'app_logs', keyCols: ['id'] },
      { table: 'audit_trails', keyCols: ['id'] },
    ];

    for (const step of plan) {
      const cols = getSqliteColumns(step.table);
      if (!cols.length) { console.log(`SKIP ${step.table} (no columns)`); continue; }
      const rows = getSqliteRows(step.table);
      if (!rows.length) { console.log(`OK ${step.table} (0 rows)`); continue; }
      const normRows = rows.map(r => normalizeRow(step.table, r));

      // Ensure key columns exist in sqlite rows. If not, try alternative unique columns
      let keyCols = step.keyCols.filter(k => cols.includes(k));
      if (!keyCols.length && step.preferKeys) {
        const alt = step.preferKeys.filter(k => cols.includes(k));
        if (alt.length) keyCols = alt;
      }
      if (!keyCols.length) {
        console.log(`WARN ${step.table}: missing key columns in SQLite, using all columns as conflict target`);
        keyCols = cols;
      }

      let migrated = 0;
      for (const part of chunk(normRows, 500)) {
        migrated += await upsertBatch(pool, step.table, keyCols, part, cols);
      }
      console.log(`OK ${step.table} (${migrated} rows)`);
    }

    console.log('Migration complete.');
  } finally {
    try { await pool.end(); } catch (e) { /* ignore pooler termination */ }
  }
  process.exit(0);
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  });
}
