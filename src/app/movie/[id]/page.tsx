import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Star } from "lucide-react";

function minsToHrs(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${r}m`;
}

export default async function MovieOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = process.env.NEXT_PUBLIC_SITE_URL && /^https?:\/\//i.test(process.env.NEXT_PUBLIC_SITE_URL)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : host ? `${proto}://${host}` : 'http://localhost:3000';
  const res = await fetch(`${base}/api/movies?id=${id}`, { cache: 'no-store' });
  const data = await res.json().catch(() => null);
  const movie = data?.movie as {
    id: string;
    title: string;
    backdrop: string | null;
    poster: string | null;
    rating: number | null;
    durationMins: number | null;
    categories: string[];
    releaseDate: string | null;
    formats: string[];
    languages: string[];
  } | null;
  if (!movie) return notFound();

  return (
    <main className="relative isolate min-h-screen">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: movie.backdrop ? `url('${movie.backdrop}')` : undefined }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 sm:gap-8">
          {/* Poster */}
          <div className="relative h-[420px] w-full overflow-hidden rounded-xl ring-1 ring-white/10">
            {movie.poster && (
              <Image
                src={movie.poster}
                alt={movie.title}
                fill
                sizes="280px"
                className="object-cover"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center text-xs text-white/80">
              In cinemas
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {movie.title}
            </h1>

            {/* Rating pill + Rate now */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
                <Star className="h-4 w-4 text-pink-400 fill-pink-400" />
                <span className="font-semibold">{movie.rating ?? ''}/10</span>
                <span className="text-white/60">(votes)</span>
              </div>
              <button className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25 active:scale-95 transition">
                Rate now
              </button>
            </div>

            {/* Formats */}
            <div className="mt-4 flex flex-wrap gap-2">
              {movie.formats.map((f) => (
                <span key={f} className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
                  {f}
                </span>
              ))}
            </div>

            {/* Languages */}
            <div className="mt-3 flex flex-wrap gap-2">
              {movie.languages.map((l) => (
                <span key={l} className="rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 text-white/80">
                  {l}
                </span>
              ))}
            </div>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-white/80">
              {typeof movie.durationMins === 'number' && <span>{minsToHrs(movie.durationMins)}</span>}
              <span>•</span>
              <span>{movie.categories.join(", ")}</span>
              <span>•</span>
              {movie.releaseDate && <span>{new Date(movie.releaseDate).toLocaleDateString()}</span>}
            </div>

            <div className="mt-6">
              <a href={`/movie/${id}/book`} className="inline-block rounded-full bg-pink-600 px-6 py-3 text-sm font-semibold text-white ring-1 ring-pink-500/40 transition-all hover:bg-pink-500 active:scale-95">
                Book tickets
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
