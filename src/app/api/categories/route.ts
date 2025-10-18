import { NextRequest } from "next/server";
import { listPublicCategoriesWithCounts } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const categories = listPublicCategoriesWithCounts();
  return Response.json({ categories });
}
