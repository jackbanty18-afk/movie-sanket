"use client";

import { useMemo, useState } from "react";

export type Seat = {
  id: string; // e.g., "A1"
  row: string;
  num: number;
  tier: "NORMAL" | "EXECUTIVE" | "PREMIUM" | "VIP";
  sold?: boolean;
};

export type SeatMapProps = {
  showId: string;
  onClose: () => void;
  tierPrices: Record<"NORMAL" | "EXECUTIVE" | "PREMIUM" | "VIP", number>;
  onPay?: (seats: Seat[], total: number) => void;
};

type SeatRow = {
  id: string;
  tier: Seat["tier"];
  seatCount: number;
  gap?: number;
};

type SeatLayout = {
  rows: SeatRow[];
  metadata: {
    totalSeats: number;
    tierCounts: Record<string, number>;
  };
};

function makeSeats(seed: string, seatLayout?: SeatLayout): Seat[] {
  // Default layout if none provided
  const defaultRows: SeatRow[] = [
    { id: "K", tier: "VIP", seatCount: 14 },
    { id: "J", tier: "VIP", seatCount: 14 },
    { id: "H", tier: "PREMIUM", seatCount: 22 },
    { id: "G", tier: "PREMIUM", seatCount: 22 },
    { id: "F", tier: "PREMIUM", seatCount: 22 },
    { id: "E", tier: "PREMIUM", seatCount: 22 },
    { id: "D", tier: "EXECUTIVE", seatCount: 22 },
    { id: "C", tier: "EXECUTIVE", seatCount: 22 },
    { id: "B", tier: "NORMAL", seatCount: 18 },
    { id: "A", tier: "NORMAL", seatCount: 18 },
  ];

  const rows = seatLayout?.rows || defaultRows;
  const out: Seat[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  const rand = () => ((h = (1103515245 * h + 12345) >>> 0) / 0xffffffff);

  for (const r of rows) {
    for (let i = 1; i <= r.seatCount; i++) {
      const id = `${r.id}${i}`;
      out.push({ id, row: r.id, num: i, tier: r.tier, sold: rand() > 0.85 });
    }
  }
  return out;
}

export default function SeatMap({ showId, onClose, tierPrices, onPay }: SeatMapProps) {
  const seats = useMemo(() => makeSeats(showId), [showId]);
  const [selected, setSelected] = useState<Record<string, Seat>>({});

  const toggle = (s: Seat) => {
    if (s.sold) return;
    setSelected((curr) => {
      const next = { ...curr } as Record<string, Seat>;
      if (next[s.id]) delete next[s.id];
      else next[s.id] = s;
      return next;
    });
  };
  const unselect = (s: Seat) => {
    setSelected((curr) => {
      const next = { ...curr } as Record<string, Seat>;
      if (next[s.id]) delete next[s.id];
      return next;
    });
  };

  const total = Object.values(selected).reduce((sum, s) => sum + tierPrices[s.tier], 0);

  const groups: Record<string, Seat[]> = useMemo(() => {
    const g: Record<string, Seat[]> = {};
    for (const s of seats) {
      (g[s.row] ||= []).push(s);
    }
    // ensure numeric order
    for (const row of Object.keys(g)) g[row].sort((a, b) => a.num - b.num);
    return g;
  }, [seats]);

  const tierLabel = (t: Seat["tier"]) =>
    t === "VIP" ? "₹" + tierPrices[t] + " VIP" : `₹${tierPrices[t]} ${t}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6">
      <div className="relative w-full max-w-5xl rounded-t-2xl sm:rounded-2xl bg-zinc-950 ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <h3 className="text-base sm:text-lg font-semibold">Select seats</h3>
          <button onClick={onClose} className="rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">Close</button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-4 py-5 sm:px-6">
          {/* Legend */}
          <div className="mb-4 flex items-center gap-4 text-xs text-white/70">
            <div className="flex items-center gap-1"><span className="h-3 w-5 rounded border border-white/30 bg-transparent inline-block" /> Available</div>
            <div className="flex items-center gap-1"><span className="h-3 w-5 rounded border border-pink-500 bg-pink-600 inline-block" /> Selected</div>
            <div className="flex items-center gap-1"><span className="h-3 w-5 rounded border border-white/20 bg-white/20 inline-block" /> Sold</div>
          </div>

          {/* Sections */}
          {(["VIP","PREMIUM","EXECUTIVE","NORMAL"] as const).map((tier) => (
            <div key={tier} className="mb-6">
              <div className="mb-2 text-center text-xs sm:text-sm text-white/80">{tier === "VIP" ? `₹${tierPrices[tier]} VIP` : `₹${tierPrices[tier]} ${tier}`}</div>
              <div className="space-y-2">
                {Object.keys(groups)
                  .filter((r) => groups[r][0].tier === tier)
                  .sort()
                  .map((row) => (
                    <div key={row} className="flex items-center gap-2">
                      <div className="w-5 text-xs text-white/60">{row}</div>
                      <div className="flex flex-wrap gap-1">
                        {groups[row].map((s) => {
                          const isSel = !!selected[s.id];
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggle(s)}
                              onDoubleClick={() => unselect(s)}
                              className={`h-7 w-7 rounded border text-xs ${
                                s.sold
                                  ? "cursor-not-allowed border-white/20 bg-white/20 text-white/40"
                                  : isSel
                                  ? "border-pink-500 bg-pink-600 text-white"
                                  : "border-white/30 bg-transparent text-white/90 hover:bg-white/10"
                              }`}
                              title={`${s.id} • ${tierLabel(s.tier)}`}
                            >
                              {s.num}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-white/80">
              {Object.keys(selected).length} seat(s) selected • Total: <span className="font-semibold text-white">₹{total}</span>
            </div>
            <button
              disabled={total === 0}
              onClick={() => onPay && onPay(Object.values(selected), total)}
              className={`rounded-md px-5 py-2 text-sm font-semibold ring-1  ${
                total === 0
                  ? "bg-white/10 text-white/40 ring-white/15 cursor-not-allowed"
                  : "bg-pink-600 text-white ring-pink-500/40 hover:bg-pink-500"
              }`}
            >
              {total === 0 ? "Select seats to continue" : `Pay ₹${total}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}