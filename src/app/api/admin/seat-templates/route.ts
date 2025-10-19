import { NextRequest } from "next/server";
import { getSeatTemplate, upsertSeatTemplate, deleteSeatTemplate, SeatTemplateRow } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theatreId = searchParams.get("theatreId");
    
    if (!theatreId) {
      return Response.json({ error: "Theatre ID is required" }, { status: 400 });
    }

    const template = await (getSeatTemplate as any)(theatreId);
    return Response.json({ template });
  } catch (error) {
    return Response.json({ error: "Failed to fetch seat template" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      theatreId, 
      name, 
      layout, 
      normalSeats = 0, 
      executiveSeats = 0, 
      premiumSeats = 0, 
      vipSeats = 0 
    } = body;
    
    if (!theatreId || !name || !layout) {
      return Response.json({ error: "Theatre ID, name, and layout are required" }, { status: 400 });
    }

    const totalSeats = Number(normalSeats) + Number(executiveSeats) + Number(premiumSeats) + Number(vipSeats);

    const templateData: Omit<SeatTemplateRow, 'id'> = {
      theatreId,
      name,
      layout: typeof layout === 'string' ? layout : JSON.stringify(layout),
      totalSeats,
      normalSeats: Number(normalSeats),
      executiveSeats: Number(executiveSeats),
      premiumSeats: Number(premiumSeats),
      vipSeats: Number(vipSeats),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await (upsertSeatTemplate as any)(templateData);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to save seat template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theatreId = searchParams.get("theatreId");
    
    if (!theatreId) {
      return Response.json({ error: "Theatre ID is required" }, { status: 400 });
    }

    await (deleteSeatTemplate as any)(theatreId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete seat template" }, { status: 500 });
  }
}