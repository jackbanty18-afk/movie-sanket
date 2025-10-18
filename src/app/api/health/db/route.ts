import { NextRequest } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const rows = await pgQuery<{ now: string }>("select now() as now");
    return Response.json({ ok: true, now: rows[0]?.now ?? null });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}