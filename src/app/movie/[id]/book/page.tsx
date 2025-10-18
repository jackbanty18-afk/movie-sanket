"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Clock, Star } from "lucide-react";
import { next7Days } from "@/data/theatres";
import SeatMap from "@/components/SeatMap";
import { getProfile } from "@/lib/user";

export default function BookTicketsPage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<{
    id: string;
    title: string;
    durationMins: number | null;
    rating: number | null;
    categories: string[];
  } | null>(null);
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  // Read profile only on client to avoid hydration mismatch
  useMemo(() => {
    try {
      const p = getProfile();
      setLoggedIn(!!p?.email);
    } catch {
      setLoggedIn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/movies?id=${id}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setMovie(d?.movie || null))
      .catch(() => setMovie(null));
  }, [id]);

  const days = useMemo(() => next7Days(), []);
  const [dateKey, setDateKey] = useState(days[0].key);

  const [shows, setShows] = useState<Array<{ id:string; theatreId:string; theatreName:string; time:string; prices: Record<string, number>; tag?:string }>>([]);
  useEffect(() => {
    if (!id || !dateKey) return;
    fetch(`/api/shows?movieId=${id}&date=${dateKey}`, { cache: 'no-store' })
      .then(r=>r.json())
      .then(d=> setShows(d.shows || []))
      .catch(()=> setShows([]));
  }, [id, dateKey]);

  type ShowClient = { id:string; theatreId:string; theatreName:string; time:string; prices: Record<string, number>; tag?:string };
  const [activeShow, setActiveShow] = useState<ShowClient | null>(null);
  const [pricingOpenFor, setPricingOpenFor] = useState<string | null>(null);

  const theatreGroups = useMemo(() => {
    const map: Record<string, ShowClient[]> = {};
    for (const s of shows) (map[s.theatreId] ||= []).push(s as ShowClient);
    return map;
  }, [shows]);

  if (!movie) return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">Movie not found.</div>
    </main>
  );

  const minsToHrs = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{movie.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-white/80 text-sm">
            {typeof movie.durationMins === 'number' && (
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {minsToHrs(movie.durationMins)}</span>
            )}
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-pink-400 fill-pink-400" /> {movie.rating ?? ''}/10</span>
            <span>{movie.categories.join(" • ")}</span>
          </div>
        </div>
        <button onClick={() => router.push(`/movie/${movie.id}`)} className="self-start rounded-md bg-white/10 px-3 py-1.5 text-sm ring-1 ring-white/15 hover:bg-white/20">Back</button>
      </div>

      {/* Calendar */}
      <section className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-white/70 text-sm">
          <CalendarDays className="h-4 w-4" /> Pick a date
        </div>
        <div className="overflow-x-auto">
          <div className="flex w-max gap-2">
            {days.map((d) => {
              const active = d.key === dateKey;
              return (
                <button
                  key={d.key}
                  onClick={() => setDateKey(d.key)}
                  className={`rounded-xl px-4 py-2 text-sm ring-1 transition ${
                    active
                      ? "bg-pink-600 ring-pink-500/40 text-white"
                      : "bg-white/5 ring-white/10 text-white/80 hover:bg-white/10"
                  }`}
                  title={d.key}
                >
                  <div className="text-xs">{d.day.toUpperCase()}</div>
                  <div className="font-semibold">{d.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Theatres */}
      <section className="mt-6">
        {Object.entries(theatreGroups).map(([theatreId, slots]) => {
          const name = (slots as ShowClient[])[0]?.theatreName || theatreId;
          if ((slots as ShowClient[]).length === 0) return null;
          return (
            <article key={theatreId} className="mb-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{name}</h3>
                <div className="text-xs text-white/60">Cancellation {(((theatreId.charCodeAt(0) + theatreId.length) * 7) % 3) !== 0 ? "available" : "not available"}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {(slots as ShowClient[]).map((s) => (
                  <div key={s.id} className="relative">
                    <button
                      onClick={() => setPricingOpenFor(pricingOpenFor === s.id ? null : s.id)}
                      className="rounded-md border border-emerald-500/50 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {s.time}
                      {s.tag && <span className="ml-2 text-[10px] text-white/60">{s.tag}</span>}
                    </button>

                    {pricingOpenFor === s.id && (
                      <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl bg-zinc-950 p-3 ring-1 ring-white/10 shadow-xl">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(s.prices).map(([tier, price]) => (
                            <button
                              key={tier}
                              onClick={() => {
                                setActiveShow(s);
                                setPricingOpenFor(null);
                              }}
                              className="rounded-lg bg-white/5 p-2 text-left ring-1 ring-white/10 hover:bg-white/10"
                            >
                              <div className="font-semibold">₹{price}.00</div>
                              <div className="text-xs text-white/70">{tier}</div>
                              <div className="text-emerald-400 text-xs mt-1">Available</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          );
        })}

        {Object.keys(theatreGroups).length === 0 && (
          <div className="rounded-xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">No shows available for this date.</div>
        )}
      </section>

      {loggedIn === false && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70">
          <div className="rounded-2xl bg-zinc-950 p-6 ring-1 ring-white/10 text-center max-w-sm">
            <h3 className="text-lg font-semibold">Login required</h3>
            <p className="mt-1 text-white/70 text-sm">Please login to book tickets.</p>
            <div className="mt-3 flex justify-center gap-2">
              <a href="/auth/login" className="rounded-md bg-pink-600 px-4 py-2 text-sm text-white ring-1 ring-pink-500/40">Login</a>
              <a href="/auth/signup" className="rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20">Sign up</a>
            </div>
          </div>
        </div>
      )}

      {activeShow && (
        <SeatMap
          showId={activeShow.id}
          tierPrices={activeShow.prices}
          onClose={() => setActiveShow(null)}
          onPay={(seats, total) => {
            const draft = {
              movieId: movie.id,
              movieTitle: movie.title,
              theatreId: activeShow.theatreId,
              theatreName: activeShow.theatreName,
              showId: activeShow.id,
              dateKey,
              time: activeShow.time,
              seats: seats.map((s) => ({ id: s.id, tier: s.tier, price: activeShow.prices[s.tier] })),
              total,
            };
            const encoded = typeof window !== 'undefined' ? btoa(encodeURIComponent(JSON.stringify(draft))) : '';
            router.push(`/checkout?d=${encoded}`);
          }}
        />
      )}
    </main>
  );
}