import { NextRequest } from "next/server";
import { listPublicCategoriesWithCounts } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const categories = await (listPublicCategoriesWithCounts as any)();
  return Response.json({ categories });
}
