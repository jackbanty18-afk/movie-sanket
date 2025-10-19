import { NextRequest } from "next/server";
import { getProfileByEmail, upsertProfile } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });
  const p = await (getProfileByEmail as any)(email);
  return Response.json({ profile: p });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.email || !body?.fullName || !body?.id || !body?.createdAt) {
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });
  }
  await (upsertProfile as any)(body);
  return Response.json({ ok: true });
}
