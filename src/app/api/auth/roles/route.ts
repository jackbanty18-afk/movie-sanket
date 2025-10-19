import { NextRequest } from "next/server";
import { getRolesByEmail } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });
  const roles = await (getRolesByEmail as any)(email);
  return Response.json({ roles });
}
