export type BookingSeat = { id: string; tier: "NORMAL" | "EXECUTIVE" | "PREMIUM" | "VIP"; price: number };
export type BookingDraft = {
  movieId: string;
  movieTitle: string;
  theatreId: string;
  theatreName: string;
  showId: string;
  dateKey: string; // YYYY-MM-DD
  time: string; // 08:00 PM
  seats: BookingSeat[];
  total: number;
};

export type Ticket = BookingDraft & {
  ticketId: string; // confirmation code
  purchasedAt: string; // ISO
  userEmail?: string;
};

const KEY = "mdtalkies_tickets_v1";

export function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return [];
    return JSON.parse(v) as Ticket[];
  } catch {
    return [];
  }
}

export function saveTicket(t: Ticket) {
  if (typeof window === "undefined") return;
  const all = loadTickets();
  all.unshift(t);
  localStorage.setItem(KEY, JSON.stringify(all));
}
