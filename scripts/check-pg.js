const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function normalize(cs) {
  try {
    const u = new URL(cs);
    if (!u.searchParams.get('sslmode')) u.searchParams.set('sslmode', 'require');
    if (!u.searchParams.get('pgbouncer')) u.searchParams.set('pgbouncer', 'true');
    return u.toString();
  } catch { return cs; }
}

(async () => {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
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
    let cs = process.env.DATABASE_URL;
    const driver = (process.env.DB_DRIVER || '').toLowerCase();
    if (!cs) {
      console.log('DATABASE_URL=NOT_SET');
      process.exit(2);
    }
    if (driver !== 'pg') {
      console.log('DB_DRIVER!=' + 'pg' + ' (' + driver + ')');
      process.exit(3);
    }
    // Basic validation without exposing secrets
    const atCount = (cs.match(/@/g) || []).length;
    if (atCount > 1) {
      console.log('DATABASE_URL_INVALID: contains unencoded @ in password. Encode @ as %40');
      process.exit(4);
    }
    cs = normalize(cs);
    let host='(parse_error)';
    try { host = new URL(cs).host; } catch {}
    console.log('PG_TARGET_HOST', host);
    const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 1, keepAlive: true, connectionTimeoutMillis: 15000 });
    const r = await pool.query('select now() as now');
    console.log('PG_OK', r.rows[0]?.now ? 'NOW_OK' : 'NOW_MISSING');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.log('PG_ERR', e.message || String(e));
    process.exit(1);
  }
})();
