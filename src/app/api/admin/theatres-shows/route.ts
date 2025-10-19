import { NextRequest } from "next/server";
import { getRolesByEmail, listTheatres, upsertTheatre, deleteTheatre, listShows, upsertShow, deleteShow, listMovies, type TheatreRow, type ShowRow } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function assertAdmin(req: NextRequest) {
  const email = req.headers.get("x-user-email") || "";
  const roles = await (getRolesByEmail as any)(email);
  if (!roles.includes("admin")) throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
}

// Theatres
export async function GET(req: NextRequest) {
  try { await assertAdmin(req); } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") || "theatres";
  if (kind === "theatres") {
    return Response.json({ theatres: await (listTheatres as any)() });
  }
  if (kind === "shows") {
    const movieId = searchParams.get("movieId");
    const dateKey = searchParams.get("date");
    return Response.json({ shows: await (listShows as any)({ movieId: movieId || undefined, dateKey: dateKey || undefined, publishedOnly: false }) });
  }
  if (kind === "movies") {
    return Response.json({ movies: await (listMovies as any)() });
  }
  return new Response(JSON.stringify({ error: "unknown kind" }), { status: 400 });
}

export async function POST(req: NextRequest) {
  try { await assertAdmin(req); } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") || "theatres";
  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  if (kind === "theatres") {
    const id = body.id || `th_${Math.random().toString(36).slice(2,10)}`;
    const row = { id, name: body.name, city: body.city || null, address: body.address || null, createdAt: now };
    if (!row.name) return new Response(JSON.stringify({ error: "name required" }), { status: 400 });
    await (upsertTheatre as any)(row as TheatreRow);
    return Response.json({ id });
  }
  if (kind === "shows") {
    const id = body.id || `sh_${Math.random().toString(36).slice(2,10)}`;
    const normDate = (() => {
      const v: string = String(body.dateKey || '');
      if (!v) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      try { return new Date(v).toISOString().slice(0,10); } catch { return ''; }
    })();
    const row = { id, movieId: body.movieId?.trim?.() || body.movieId, theatreId: body.theatreId?.trim?.() || body.theatreId, dateKey: normDate, time: String(body.time||'').trim(), format: body.format ? String(body.format) : null, language: body.language ? String(body.language) : null, prices: JSON.stringify(body.prices || { NORMAL: 200, EXECUTIVE: 220, PREMIUM: 250, VIP: 400 }), published: body.published ? 1 : 0, createdAt: now, updatedAt: now };
    if (!row.movieId || !row.theatreId || !row.dateKey || !row.time) return new Response(JSON.stringify({ error: "missing fields: movieId, theatreId, dateKey, time" }), { status: 400 });
    await (upsertShow as any)(row as ShowRow);
    return Response.json({ id });
  }
  return new Response(JSON.stringify({ error: "unknown kind" }), { status: 400 });
}

export async function PUT(req: NextRequest) {
  try { await assertAdmin(req); } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") || "theatres";
  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  if (kind === "theatres") {
    if (!body.id || !body.name) return new Response(JSON.stringify({ error: "id and name required" }), { status: 400 });
    const row = { id: body.id, name: body.name, city: body.city || null, address: body.address || null, createdAt: body.createdAt || now };
    await (upsertTheatre as any)(row as TheatreRow);
    return Response.json({ ok: true });
  }
  if (kind === "shows") {
    if (!body.id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    const row = { id: body.id, movieId: body.movieId, theatreId: body.theatreId, dateKey: body.dateKey, time: body.time, format: body.format || null, language: body.language || null, prices: JSON.stringify(body.prices || {}), published: body.published ? 1 : 0, createdAt: body.createdAt || now, updatedAt: now };
    await (upsertShow as any)(row as ShowRow);
    return Response.json({ ok: true });
  }
  return new Response(JSON.stringify({ error: "unknown kind" }), { status: 400 });
}

export async function DELETE(req: NextRequest) {
  try { await assertAdmin(req); } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") || "theatres";
  const id = searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  if (kind === "theatres") { await (deleteTheatre as any)(id); return Response.json({ ok: true }); }
  if (kind === "shows") { await (deleteShow as any)(id); return Response.json({ ok: true }); }
  return new Response(JSON.stringify({ error: "unknown kind" }), { status: 400 });
}
