"use client";

import { useEffect, useState } from "react";
import { loadTickets, type Ticket } from "@/lib/booking";
import { getProfile } from "@/lib/user";

export default function TicketsPage() {
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  useEffect(() => {
    setMounted(true);
    const p = getProfile();
    const all = loadTickets();
    const list = p?.email ? all.filter((t) => (t as { userEmail?: string }).userEmail === p.email) : all;
    setTickets(list);
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Your Tickets</h1>
      {!mounted ? (
        <p className="mt-2 text-white/70">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="mt-2 text-white/70">No tickets booked yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {tickets.map((t) => (
            <div key={t.ticketId} className="flex items-center justify-between rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div>
                <div className="font-semibold">{t.movieTitle} • {t.theatreName}</div>
                <div className="text-sm text-white/60">{t.dateKey} • {t.time} • Seats: {(t.seats as Array<{id:string}>).map((s) => s.id).join(", ")} • ID: {t.ticketId}</div>
              </div>
              <a href={`/movie/${t.movieId}`} className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">Details</a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
