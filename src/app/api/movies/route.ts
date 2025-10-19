import { NextRequest } from "next/server";
import { getPublicMovie, listPublicMovies } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const movie = await (getPublicMovie as any)(id);
    if (!movie || movie.published === 0) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    return Response.json({ movie });
  }
  const published = (searchParams.get("published") ?? "1") !== "0";
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const sort = searchParams.get("sort") ?? undefined;
  const dir = (searchParams.get("dir") as "asc" | "desc" | null) ?? null;
  const limit = Number(searchParams.get("limit") || 20);
  const movies = await (listPublicMovies as any)({ publishedOnly: published, category, q, sort, dir, limit });
  return Response.json({ movies });
}
