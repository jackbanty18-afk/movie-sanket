import { NextRequest } from "next/server";
import { listPricingTiers, createPricingTier, updatePricingTier, deletePricingTier, PricingTierRow } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tiers = await (listPricingTiers as any)();
    return Response.json({ tiers });
  } catch (error) {
    return Response.json({ error: "Failed to fetch pricing tiers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, baseMultiplier = 1.0, weekendMultiplier = 1.2, holidayMultiplier = 1.5 } = body;
    
    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const tierData: Omit<PricingTierRow, 'id'> = {
      name,
      description: description || null,
      baseMultiplier: Number(baseMultiplier),
      weekendMultiplier: Number(weekendMultiplier),
      holidayMultiplier: Number(holidayMultiplier),
      createdAt: new Date().toISOString()
    };

    await (createPricingTier as any)(tierData);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to create pricing tier" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return Response.json({ error: "ID is required" }, { status: 400 });
    }

    // Convert string numbers to actual numbers
    if (updates.baseMultiplier !== undefined) updates.baseMultiplier = Number(updates.baseMultiplier);
    if (updates.weekendMultiplier !== undefined) updates.weekendMultiplier = Number(updates.weekendMultiplier);
    if (updates.holidayMultiplier !== undefined) updates.holidayMultiplier = Number(updates.holidayMultiplier);

    await (updatePricingTier as any)(Number(id), updates);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to update pricing tier" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return Response.json({ error: "ID is required" }, { status: 400 });
    }

    await (deletePricingTier as any)(Number(id));
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete pricing tier" }, { status: 500 });
  }
}