"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Star, Play } from "lucide-react";

export type PublicMovie = {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  categories: string[];
  rating: number | null;
};

export default function MoviesGrid() {
  const params = useSearchParams();
  const router = useRouter();
  const current = (params.get("category") as string | null) ?? "All";
  const [movies, setMovies] = useState<PublicMovie[] | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (current && current !== "All") sp.set("category", current);
    sp.set("published", "1");
    sp.set("limit", "20");
    fetch(`/api/movies?${sp.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMovies(d.movies || []))
      .catch(() => setMovies([]));
  }, [current]);

  const list = movies ?? [];

  return (
    <section id="movies" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-white">Trending Now</h3>
      </div>

      {movies === null ? (
        <p className="mt-6 text-white/70">Loading...</p>
      ) : list.length === 0 ? (
        <p className="mt-6 text-white/70">No movies match this category.</p>
      ) : (
        <div className="mt-4 overflow-x-auto modern-scroll pb-3">
          <div className="flex w-max gap-4 sm:gap-6 snap-x snap-mandatory">
            {list.map((m) => (
              <article
                key={m.id}
                className="group relative h-[340px] w-[220px] sm:h-[360px] sm:w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              >
                {/* Poster */}
                <div className="absolute inset-0">
                  {m.poster && (
                    <Image
                      src={m.poster}
                      alt={m.title}
                      fill
                      sizes="(max-width: 768px) 220px, 240px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>

                {/* Top gradient mask */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-70" />

                {/* Info panel (revealed on hover) */}
                <div className="absolute inset-x-0 bottom-0 translate-y-6 opacity-0 p-4 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <h4 className="text-lg font-extrabold text-white drop-shadow-md">
                    {m.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-white/80 text-sm">
                    <span>{m.year ?? ''}</span>
                    <span>•</span>
                    <span className="truncate">{m.categories.join(" • ")}</span>
                  </div>

                  {/* Rating + View */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-pink-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-semibold text-white">{m.rating ?? ''}</span>
                    </div>
                    <button
                      onClick={() => router.push(`/movie/${m.id}`)}
                      className="inline-flex items-center gap-2 rounded-full bg-pink-600/90 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 transition-all hover:bg-pink-500 active:scale-95"
                    >
                      <Play className="h-4 w-4" />
                      View
                    </button>
                  </div>
                </div>

                {/* Subtle outline on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 group-hover:ring-white/25" />
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
