import { NextRequest } from "next/server";
import { getRolesByEmail, listCategories, createCategory, deleteCategory } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function assertAdmin(req: NextRequest) {
  const email = req.headers.get("x-user-email") || "";
  const roles = await (getRolesByEmail as any)(email);
  if (!roles.includes("admin")) throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
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
