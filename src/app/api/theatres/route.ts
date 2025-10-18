import { NextRequest } from "next/server";
import { listTheatres } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return Response.json({ theatres: listTheatres() });
}
