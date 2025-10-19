import { NextRequest } from "next/server";
import { getTheatrePricing, upsertTheatrePricing, deleteTheatrePricing, TheatrePricingRow, listTheatres, listPricingTiers } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theatreId = searchParams.get("theatreId");
    
    if (!theatreId) {
      return Response.json({ error: "Theatre ID is required" }, { status: 400 });
    }

    const pricing = await (getTheatrePricing as any)(theatreId);
    const pricingTiers = await (listPricingTiers as any)();
    
    return Response.json({ pricing, pricingTiers });
  } catch (error) {
    return Response.json({ error: "Failed to fetch theatre pricing" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { theatreId, pricingTierId, normalPrice, executivePrice, premiumPrice, vipPrice } = body;
    
    if (!theatreId || !pricingTierId || !normalPrice || !executivePrice || !premiumPrice || !vipPrice) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    const pricingData: TheatrePricingRow = {
      theatreId,
      pricingTierId: Number(pricingTierId),
      normalPrice: Number(normalPrice),
      executivePrice: Number(executivePrice),
      premiumPrice: Number(premiumPrice),
      vipPrice: Number(vipPrice)
    };

    await (upsertTheatrePricing as any)(pricingData);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to save theatre pricing" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theatreId = searchParams.get("theatreId");
    const pricingTierId = searchParams.get("pricingTierId");
    
    if (!theatreId || !pricingTierId) {
      return Response.json({ error: "Theatre ID and Pricing Tier ID are required" }, { status: 400 });
    }

    await (deleteTheatrePricing as any)(theatreId, Number(pricingTierId));
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete theatre pricing" }, { status: 500 });
  }
}