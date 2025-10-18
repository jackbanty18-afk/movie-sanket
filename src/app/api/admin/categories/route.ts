import { NextRequest } from "next/server";
import { getRolesByEmail, listCategories, createCategory, deleteCategory } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertAdmin(req: NextRequest) {
  const email = req.headers.get("x-user-email") || "";
  const roles = getRolesByEmail(email);
  if (!roles.includes("admin")) throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
}

export async function GET(req: NextRequest) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  return Response.json({ categories: listCategories() });
}

export async function POST(req: NextRequest) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return new Response(JSON.stringify({ error: "name required" }), { status: 400 });
  createCategory(name);
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  deleteCategory(id);
  return Response.json({ ok: true });
}
