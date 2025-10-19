import { NextRequest } from "next/server";
import { listAllBookings, getBooking, updateBookingStatus, processRefund, updateBookingSeats, getBookingsByUser } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    if (ticketId) {
      // Get specific booking
      const booking = await (getBooking as any)(ticketId);
      if (!booking) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
      }
      return Response.json({ booking });
    } else if (userId) {
      // Get bookings for specific user
      const bookings = await (getBookingsByUser as any)(userId);
      return Response.json({ bookings, total: bookings.length });
    } else {
      // List all bookings with pagination
      const result = await (listAllBookings as any)({ status: status || undefined, limit, offset });
      return Response.json(result);
    }
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return Response.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, action, reason, refundAmount, seats, seatCount } = body;
    
    if (!ticketId || !action) {
      return Response.json({ error: "Ticket ID and action are required" }, { status: 400 });
    }

    switch (action) {
      case 'cancel':
        await (updateBookingStatus as any)(ticketId, 'cancelled', reason);
        break;
        
      case 'refund':
        if (refundAmount === undefined) {
          return Response.json({ error: "Refund amount is required" }, { status: 400 });
        }
        await (processRefund as any)(ticketId, refundAmount, reason);
        break;
        
      case 'confirm':
        await (updateBookingStatus as any)(ticketId, 'confirmed');
        break;
        
      case 'updateSeats':
        if (!seats) {
          return Response.json({ error: "Seats are required" }, { status: 400 });
        }
        await (updateBookingSeats as any)(ticketId, seats, seatCount);
        break;
        
      case 'updateStatus':
        const { status } = body;
        if (!status) {
          return Response.json({ error: "Status is required" }, { status: 400 });
        }
        await (updateBookingStatus as any)(ticketId, status, reason);
        break;
        
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to update booking:", error);
    return Response.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const reason = searchParams.get("reason") || "Cancelled by admin";
    
    if (!ticketId) {
      return Response.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    await (updateBookingStatus as any)(ticketId, 'cancelled', reason);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return Response.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}