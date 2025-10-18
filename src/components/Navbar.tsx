"use client";

import Link from "next/link";
import { Menu, Search, User, Ticket, LogIn, UserPlus, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MOVIES } from "@/data/movies";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [sidebar, setSidebar] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as typeof MOVIES;
    const starts = MOVIES.filter((m) => m.title.toLowerCase().startsWith(q));
    const contains = MOVIES.filter(
      (m) => m.title.toLowerCase().includes(q) && !m.title.toLowerCase().startsWith(q)
    );
    return [...starts, ...contains].slice(0, 8);
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [results.length]);


  const goAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const choose = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/movie/${id}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="text-xl font-extrabold tracking-wide">
          <span className="text-white">MD</span>{" "}
          <span className="text-pink-500">TALKIES</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => goAnchor("hero")} className="text-sm text-white/80 hover:text-white">Home</button>
          <button onClick={() => goAnchor("categories")} className="text-sm text-white/80 hover:text-white">Categories</button>
          <button onClick={() => goAnchor("movies")} className="text-sm text-white/80 hover:text-white">Movies</button>
        </nav>

        {/* Center search */}
        <div className="mx-auto w-full max-w-xl hidden sm:block">
          <div className="relative" onFocus={() => setOpen(true)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onKeyDown={(e) => {
                if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
                if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
                if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
                if (e.key === "Enter" && results[active]) choose(results[active].id);
              }}
              placeholder="Search movies..."
              className="w-full rounded-full bg-white/10 py-2 pl-10 pr-4 text-sm text-white placeholder-white/50 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-pink-500"
              onBlur={() => setTimeout(() => setOpen(false), 100)}
            />

            {open && query && results.length > 0 && (
              <div className="absolute left-0 right-0 top-[110%] z-50 overflow-hidden rounded-xl bg-black/90 ring-1 ring-white/15 backdrop-blur">
                {results.map((m, i) => (
                  <button
                    key={m.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(m.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${i === active ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    <span className="flex-1 truncate text-white">{m.title}</span>
                    <span className="text-xs text-white/60">{m.year}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right icons */}
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <button
            aria-label="Open menu"
            onClick={() => setSidebar(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 hover:bg-white/25"
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Overlay for panels */}
      {sidebar && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-lg"
            onClick={() => setSidebar(false)}
          />
          {/* Floating menu panel */}
          <div className="absolute right-4 top-20">
              <div className="w-[320px] max-w-[92vw] overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-black ring-1 ring-white/10 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <span className="text-base font-semibold">Menu</span>
                  <button onClick={() => setSidebar(false)} className="rounded-full px-3 py-1 text-sm text-white/70 hover:bg-white/10">Close</button>
                </div>
                <nav className="p-2 grid gap-1">
                  {(() => {
                    try {
                      // safest: read directly since this is a client component
                      const p = (typeof window !== 'undefined' && window.localStorage) ? JSON.parse(window.localStorage.getItem('mdtalkies_profile_v1') || 'null') : null;
                      const logged = !!p?.email;
                      if (logged) {
                        return (
                          <>
                            <button type="button" onClick={() => { setSidebar(false); router.push('/account'); }} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-white/10">
                              <span className="flex items-center gap-3"><User className="h-5 w-5" /> Account Info</span>
                              <ChevronRight className="h-4 w-4 text-white/60" />
                            </button>
                            <button type="button" onClick={() => { setSidebar(false); router.push('/tickets'); }} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-white/10">
                              <span className="flex items-center gap-3"><Ticket className="h-5 w-5" /> Tickets</span>
                              <ChevronRight className="h-4 w-4 text-white/60" />
                            </button>
                            <button type="button" onClick={async () => { setSidebar(false); try { const { clearProfile } = await import("@/lib/user"); clearProfile(); } catch {} window.location.href = '/'; }} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-white/10">
                              <span className="flex items-center gap-3"><LogIn className="h-5 w-5 rotate-180" /> Logout</span>
                              <ChevronRight className="h-4 w-4 text-white/60" />
                            </button>
                          </>
                        );
                      }
                      return (
                        <>
                          <button type="button" onClick={() => { setSidebar(false); router.push('/auth/login'); }} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-white/10">
                            <span className="flex items-center gap-3"><LogIn className="h-5 w-5" /> Login</span>
                            <ChevronRight className="h-4 w-4 text-white/60" />
                          </button>
                          <button type="button" onClick={() => { setSidebar(false); router.push('/auth/signup'); }} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-white/10">
                            <span className="flex items-center gap-3"><UserPlus className="h-5 w-5" /> Sign up</span>
                            <ChevronRight className="h-4 w-4 text-white/60" />
                          </button>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </nav>
              </div>
            </div>
        </div>
      )}
    </header>
  );
}
