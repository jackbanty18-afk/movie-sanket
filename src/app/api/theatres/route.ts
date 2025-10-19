import { NextRequest } from "next/server";
import { listTheatres } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const theatres = await (listTheatres as any)();
  return Response.json({ theatres });
}
