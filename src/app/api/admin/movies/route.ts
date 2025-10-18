import { NextRequest } from "next/server";
import { getRolesByEmail, listMovies, upsertMovie, deleteMovie, getMovie, listCategories, setMovieCategories, getMovieCategoryIds } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertAdmin(req: NextRequest) {
  const email = req.headers.get("x-user-email") || "";
  const roles = getRolesByEmail(email);
  if (!roles.includes("admin")) throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
}

export async function GET(req: NextRequest) {
  try {
    assertAdmin(req);
  } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const movie = getMovie(id);
    const categories = listCategories();
    const selected = getMovieCategoryIds(id);
    return Response.json({ movie, categories, selected });
  }
  return Response.json({ movies: listMovies() });
}

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req);
  } catch (r) { return r as Response; }
  const body = await req.json();
  const now = new Date().toISOString();
  const id = body.id || `mov_${Math.random().toString(36).slice(2,10)}`;
  const movie = { id, title: body.title, synopsis: body.synopsis, poster: body.poster, backdrop: body.backdrop, year: body.year ?? null, rating: body.rating ?? null, durationMins: body.durationMins ?? null, releaseDate: body.releaseDate || null, languages: (body.languages || []).join(','), formats: (body.formats || []).join(','), published: body.published ? 1 : 0, createdAt: now, updatedAt: now };
  upsertMovie(movie as any);
  if (Array.isArray(body.categoryIds)) setMovieCategories(id, body.categoryIds.map((n:number)=>Number(n)));
  return Response.json({ id });
}

export async function PUT(req: NextRequest) {
  try {
    assertAdmin(req);
  } catch (r) { return r as Response; }
  const body = await req.json();
  if (!body.id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  const now = new Date().toISOString();
  const movie = { id: body.id, title: body.title, synopsis: body.synopsis, poster: body.poster, backdrop: body.backdrop, year: body.year ?? null, rating: body.rating ?? null, durationMins: body.durationMins ?? null, releaseDate: body.releaseDate || null, languages: (body.languages || []).join(','), formats: (body.formats || []).join(','), published: body.published ? 1 : 0, createdAt: body.createdAt || now, updatedAt: now };
  upsertMovie(movie as any);
  if (Array.isArray(body.categoryIds)) setMovieCategories(body.id, body.categoryIds.map((n:number)=>Number(n)));
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try {
    assertAdmin(req);
  } catch (r) { return r as Response; }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  deleteMovie(id);
  return Response.json({ ok: true });
}
