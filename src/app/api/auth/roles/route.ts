import { NextRequest } from "next/server";
import { getRolesByEmail } from "@/lib/db-router";
import { verifyJWT } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const payload = verifyJWT(auth.slice(7));
  if (!payload) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  let email = searchParams.get("email") || String((payload as any).email || "");
  if (!email) {
    return new Response(JSON.stringify({ error: "email required" }), { status: 400 });
  }
  const isSelf = String((payload as any).email || "").toLowerCase() === email.toLowerCase();
  const isAdmin = Array.isArray((payload as any).roles) && (payload as any).roles.includes('admin');
  if (!isSelf && !isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const roles = await (getRolesByEmail as any)(email);
  return Response.json({ roles });
}
