"use client";

import { useEffect, useState } from "react";

type Movie = {
  id: string; title: string; poster?: string; year?: number; rating?: number; published?: number;
};

export default function AdminMoviesPage() {
  const [items, setItems] = useState<Movie[]>([]);
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;

  const load = async () => {
    const r = await fetch('/api/admin/movies', { headers: { 'x-user-email': email || '' } });
    const data = await r.json();
    setItems(data.movies || []);
  };
  useEffect(() => { load(); }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Movies</h1>
        <a href="/admin/movies/new" className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">New movie</a>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl ring-1 ring-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/70">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Year</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id} className="border-t border-white/10">
                <td className="p-3">{m.title}</td>
                <td className="p-3">{m.year ?? '—'}</td>
                <td className="p-3">{m.rating ?? '—'}</td>
                <td className="p-3">{m.published ? 'Published' : 'Draft'}</td>
                <td className="p-3 text-right">
                  <a href={`/admin/movies/${m.id}`} className="rounded-md bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 hover:bg-white/20">Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
