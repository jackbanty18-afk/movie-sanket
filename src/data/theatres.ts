export type Theatre = {
  id: string;
  name: string;
  location?: string;
  brand?: string;
  amenities?: string[];
};

export const THEATRES: Theatre[] = [
  { id: "th1", name: "Cinepolis: Magnet Mall, Bhandup (W)", brand: "Cinepolis" },
  { id: "th2", name: "INOX: Megaplex, Inorbit Mall, Malad", brand: "INOX" },
  { id: "th3", name: "PVR: Orion Mall, Panvel", brand: "PVR" },
  { id: "th4", name: "Metro INOX Cinemas: Marine Lines", brand: "INOX" },
  { id: "th5", name: "Miraj Cinemas: IMAX, Wadala", brand: "Miraj" },
];

export type PriceMap = {
  NORMAL: number;
  EXECUTIVE: number;
  PREMIUM: number;
  VIP: number;
};

export type ShowSlot = {
  id: string;
  theatreId: string;
  time: string; // e.g. "08:00 PM"
  tag?: string; // e.g. "QSC 7.1", "ENG"
  prices: PriceMap;
};

// Utility: next 7 days (including today)
export function next7Days(base = new Date()) {
  const out: { key: string; label: string; day: string }[] = [];
  // Use UTC to avoid server/client timezone drift; fixed locale for stable SSR
  const fmtLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + i));
    const key = d.toISOString().slice(0, 10);
    const day = fmtDay.format(d);
    const label = fmtLabel.format(d);
    out.push({ key, label, day });
  }
  return out;
}

// Deterministic pseudo-random from a string
function hashToBool(seed: string, salt: string, threshold = 0.5) {
  let h = 0;
  const s = seed + ":" + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000 > threshold;
}

// Generate show slots for a given date: each theatre will have a subset of base times
const BASE_TIMES = ["06:30 PM", "07:45 PM", "08:00 PM", "09:15 PM"] as const;

export function getShowsForDate(dateKey: string): ShowSlot[] {
  const slots: ShowSlot[] = [];
  for (const th of THEATRES) {
    for (const t of BASE_TIMES) {
      if (hashToBool(dateKey + th.id, t, 0.35)) {
        slots.push({
          id: `${th.id}-${dateKey}-${t.replace(/[^\d]/g, "")}`,
          theatreId: th.id,
          time: t,
          tag: hashToBool(th.id, t, 0.6) ? "ENG" : "QSC 7.1",
          prices: { NORMAL: 220, EXECUTIVE: 220, PREMIUM: 220, VIP: 400 },
        });
      }
    }
  }
  return slots;
}