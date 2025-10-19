import { Pool } from "pg";

let pool: Pool | null = null;

function normalizeConnectionString(raw: string): string {
  // Ensure sslmode=require and pgbouncer=true are set for Supabase Session Pooler
  try {
    const u = new URL(raw);
    if (!u.searchParams.get("sslmode")) u.searchParams.set("sslmode", "require");
    if (!u.searchParams.get("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    return u.toString();
  } catch {
    return raw; // fallback
  }
}

export function getPgPool() {
  if (!pool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error("DATABASE_URL is not set. Add it in your environment (e.g., Vercel Project Settings → Environment Variables).");
    }
    const connectionString = normalizeConnectionString(raw);
    pool = new Pool({
      connectionString,
      // Supabase requires SSL in serverless; allow self-signed
      ssl: { rejectUnauthorized: false },
      max: parseInt(process.env.PG_POOL_MAX || "5", 10), // rely on Supabase pooler
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      keepAlive: true,
    });
  }
  return pool;
}

export async function pgQuery<T = any>(text: string, params: any[] = []) {
  const client = await getPgPool().connect();
  try {
    const res = await client.query<T>(text, params);
    return res.rows as unknown as T[];
  } finally {
    client.release();
  }
}
