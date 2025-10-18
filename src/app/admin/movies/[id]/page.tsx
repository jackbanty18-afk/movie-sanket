"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: number; name: string };

type Movie = {
  id: string; title: string; synopsis?: string; poster?: string; backdrop?: string; year?: number; rating?: number; durationMins?: number; releaseDate?: string; languages?: string; formats?: string; published?: number; createdAt: string; updatedAt: string;
};

export default function EditMoviePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [movie, setMovie] = useState<Partial<Movie>>({});
  const [cats, setCats] = useState<Cat[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setId(id);
      const r = await fetch(`/api/admin/movies?id=${id}`, { headers: { 'x-user-email': email || '' } });
      const d = await r.json();
      setMovie(d.movie);
      setCats(d.categories || []);
      setSelected(d.selected || []);
    })();
  }, []);

  const save = async () => {
    const body = {
      id,
      title: movie.title,
      synopsis: movie.synopsis,
      poster: movie.poster,
      backdrop: movie.backdrop,
      year: movie.year,
      rating: movie.rating,
      durationMins: movie.durationMins,
      releaseDate: movie.releaseDate,
      languages: String(movie.languages||'').split(',').map(s=>s.trim()).filter(Boolean),
      formats: String(movie.formats||'').split(',').map(s=>s.trim()).filter(Boolean),
      published: !!movie.published,
      categoryIds: selected,
      createdAt: movie.createdAt,
    };
    await fetch('/api/admin/movies', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-email': email || '' }, body: JSON.stringify(body) });
    router.push('/admin/movies');
  };

  const delMovie = async () => {
    await fetch(`/api/admin/movies?id=${id}`, { method: 'DELETE', headers: { 'x-user-email': email || '' } });
    router.push('/admin/movies');
  };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Edit movie</h1>
      {movie && (
        <div className="mt-6 grid gap-3">
          {[
            ["Title","title"],
            ["Synopsis","synopsis"],
            ["Poster URL","poster"],
            ["Backdrop URL","backdrop"],
            ["Year","year"],
            ["Rating","rating"],
            ["Duration (mins)","durationMins"],
            ["Release date (YYYY-MM-DD)","releaseDate"],
            ["Languages (comma-separated)","languages"],
            ["Formats (comma-separated)","formats"],
          ].map(([label,key]) => (
            <label key={key as string} className="grid gap-1 text-sm">
              <span className="text-white/80">{label}</span>
              <input value={(movie as any)[key as string] ?? ''} onChange={e=>setMovie({...movie, [key as string]: e.target.value})} className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" />
            </label>
          ))}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!movie.published} onChange={e=>setMovie({...movie, published: e.target.checked ? 1 : 0})} />
            <span>Published</span>
          </label>

          <div>
            <div className="text-sm text-white/80">Categories</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {cats.map(c => (
                <button key={c.id} type="button" onClick={() => setSelected(s => s.includes(c.id) ? s.filter(x=>x!==c.id) : [...s, c.id])} className={`rounded-full px-3 py-1 text-xs ring-1 ${selected.includes(c.id) ? 'bg-pink-600 ring-pink-500/40' : 'bg-white/10 ring-white/20'}`}>{c.name}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={save} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40">Save</button>
            <button onClick={delMovie} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-red-500/40">Delete</button>
            <a href="/admin/movies" className="rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20">Cancel</a>
          </div>
        </div>
      )}
    </main>
  );
}
