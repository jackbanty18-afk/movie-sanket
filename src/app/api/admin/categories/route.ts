import { NextRequest } from "next/server";
import { listCategories, createCategory, deleteCategory } from "@/lib/db-router";
import { verifyJWT } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const payload = verifyJWT(auth.slice(7));
  if (!payload || !Array.isArray((payload as any).roles) || !(payload as any).roles.includes("admin"))
    throw new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
}

export async function GET(req: NextRequest) {
  try { await assertAdmin(req); } catch (r) { return r as Response; }
  return Response.json({ categories: await (listCategories as any)() });
}

export async function POST(req: NextRequest) {
  try { await assertAdmin(req); } catch (r) { return r as Response; }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return new Response(JSON.stringify({ error: "name required" }), { status: 400 });
  await (createCategory as any)(name);
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try { await assertAdmin(req); } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  await (deleteCategory as any)(id);
  return Response.json({ ok: true });
}
