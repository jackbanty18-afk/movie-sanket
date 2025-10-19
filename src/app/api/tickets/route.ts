import { NextRequest } from "next/server";
import { insertTicket, listTicketsByEmail } from "@/lib/db-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });
  const tickets = await (listTicketsByEmail as any)(email);
  return Response.json({ tickets });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.ticketId) return new Response(JSON.stringify({ error: "ticketId required" }), { status: 400 });
  await (insertTicket as any)({ ...body, seats: JSON.stringify(body.seats ?? []) });
  return Response.json({ ok: true });
}
