import { Pool } from "pg";

let pool: Pool | null = null;

export function getPgPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Add it in your environment (e.g., Vercel Project Settings → Environment Variables).");
    }
    pool = new Pool({
      connectionString,
      // Supabase requires SSL in serverless; allow self-signed
      ssl: { rejectUnauthorized: false },
      max: 10, // rely on Supabase pooler
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
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