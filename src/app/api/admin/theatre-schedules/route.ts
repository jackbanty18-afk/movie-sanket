import { NextRequest } from "next/server";
import { getTheatreSchedules, upsertTheatreSchedule, deleteTheatreSchedule, TheatreScheduleRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theatreId = searchParams.get("theatreId");
    
    if (!theatreId) {
      return Response.json({ error: "Theatre ID is required" }, { status: 400 });
    }

    const schedules = getTheatreSchedules(theatreId);
    return Response.json({ schedules });
  } catch (error) {
    return Response.json({ error: "Failed to fetch theatre schedules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { theatreId, dayOfWeek, availableSlots, operatingHours } = body;
    
    if (!theatreId || dayOfWeek === undefined || !availableSlots || !operatingHours) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    const scheduleData: Omit<TheatreScheduleRow, 'id'> = {
      theatreId,
      dayOfWeek: Number(dayOfWeek), // 0 = Sunday, 1 = Monday, etc.
      availableSlots: typeof availableSlots === 'string' ? availableSlots : JSON.stringify(availableSlots),
      operatingHours: typeof operatingHours === 'string' ? operatingHours : JSON.stringify(operatingHours),
      createdAt: new Date().toISOString()
    };

    upsertTheatreSchedule(scheduleData);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to save theatre schedule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theatreId = searchParams.get("theatreId");
    const dayOfWeek = searchParams.get("dayOfWeek");
    
    if (!theatreId) {
      return Response.json({ error: "Theatre ID is required" }, { status: 400 });
    }

    if (dayOfWeek !== null) {
      deleteTheatreSchedule(theatreId, Number(dayOfWeek));
    } else {
      deleteTheatreSchedule(theatreId);
    }
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete theatre schedule" }, { status: 500 });
  }
}