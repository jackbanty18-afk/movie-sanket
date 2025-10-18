const { execFileSync } = require("node:child_process");
const { existsSync, mkdirSync } = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const DB_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DB_DIR, "app.db");
const SQLITE = path.join(ROOT, "tools", "sqlite3.exe");

function runSQL(sql) {
  if (!existsSync(SQLITE)) throw new Error("sqlite3.exe not found in tools/");
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  return execFileSync(SQLITE, ["-batch", DB_PATH], { input: sql, encoding: "utf8" });
}

console.log('Migrating database schema...');

// Add missing columns to users table
const migrations = [
  "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';",
  "ALTER TABLE users ADD COLUMN bannedAt TEXT;",
  "ALTER TABLE users ADD COLUMN bannedReason TEXT;",
  "ALTER TABLE users ADD COLUMN lastLoginAt TEXT;",
  "ALTER TABLE users ADD COLUMN updatedAt TEXT NOT NULL DEFAULT (datetime('now'));",
  
  // Add missing columns to tickets table
  "ALTER TABLE tickets ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';",
  "ALTER TABLE tickets ADD COLUMN refundAmount INTEGER DEFAULT 0;",
  "ALTER TABLE tickets ADD COLUMN refundReason TEXT;",
  "ALTER TABLE tickets ADD COLUMN refundAt TEXT;",
  "ALTER TABLE tickets ADD COLUMN cancelledReason TEXT;",
  "ALTER TABLE tickets ADD COLUMN updatedAt TEXT;"
];

migrations.forEach((migration, index) => {
  try {
    console.log(`Running migration ${index + 1}: ${migration}`);
    runSQL(migration);
    console.log(`✅ Migration ${index + 1} completed`);
  } catch (error) {
    console.log(`⚠️  Migration ${index + 1} skipped (probably already exists): ${error.message}`);
  }
});

console.log('Database migration completed!');