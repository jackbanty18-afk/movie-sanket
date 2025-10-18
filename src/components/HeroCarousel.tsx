"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Play, Info } from "lucide-react";

interface Slide {
  id: string;
  title: string;
  description: string;
  backdrop: string; // image URL
  rating?: string;
  date?: string;
  duration?: string;
}

const SLIDES: Slide[] = [
  {
    id: "1",
    title: "The Silent Horizon",
    description:
      "A lone explorer ventures beyond the known to uncover a secret that could change the world.",
    backdrop:
      "https://images.unsplash.com/photo-1517602302552-471fe67acf66?q=80&w=1920&auto=format&fit=crop",
    rating: "PG-13",
    date: "2024",
    duration: "2h 14m",
  },
  {
    id: "2",
    title: "Neon Nights",
    description:
      "In a city that never sleeps, justice wears a new face under neon lights.",
    backdrop:
      "https://images.unsplash.com/photo-1491554150235-360cadcda1a5?q=80&w=1920&auto=format&fit=crop",
    rating: "R",
    date: "2023",
    duration: "1h 56m",
  },
  {
    id: "3",
    title: "Beyond the Tide",
    description:
      "A heartfelt journey across oceans to find home, hope, and heart.",
    backdrop:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop",
    rating: "PG",
    date: "2022",
    duration: "1h 48m",
  },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const count = SLIDES.length;

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + count) % count);

  const trackStyle = useMemo(
    () => ({ transform: `translateX(-${index * 100}%)` }),
    [index]
  );

  return (
    <section id="hero" className="relative isolate">
      <div className="relative h-[60vh] sm:h-[70vh] overflow-hidden">
        {/* Slides */}
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={trackStyle}
        >
          {SLIDES.map((s) => (
            <div key={s.id} className="relative min-w-full">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-center bg-cover"
                style={{ backgroundImage: `url('${s.backdrop}')` }}
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

              {/* Content */}
              <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                    {s.title}
                  </h1>
                  <p className="mt-3 text-white/80 text-sm sm:text-base">
                    {s.description}
                  </p>

                  {/* Meta line (placeholders you will replace later) */}
                  <div className="mt-3 flex items-center gap-3 text-white/70 text-xs sm:text-sm">
                    {s.rating && <span className="rounded border border-white/30 px-1.5 py-0.5">{s.rating}</span>}
                    {s.date && <span>{s.date}</span>}
                    {s.duration && <span>• {s.duration}</span>}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center gap-3">
                    <button className="inline-flex items-center gap-2 rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500">
                      <Play className="h-4 w-4" /> Watch Now
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-md bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25">
                      <Info className="h-4 w-4" /> More Info
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <button
          aria-label="Previous"
          onClick={() => go(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 ring-1 ring-white/20 backdrop-blur hover:bg-black/60"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          aria-label="Next"
          onClick={() => go(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 ring-1 ring-white/20 backdrop-blur hover:bg-black/60"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Dots */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
            />)
          )}
        </div>
      </div>
    </section>
  );
}