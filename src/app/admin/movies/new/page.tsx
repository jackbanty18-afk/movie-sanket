"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: number; name: string };

export default function NewMoviePage() {
  const router = useRouter();
  const [cats, setCats] = useState<Cat[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [form, setForm] = useState({ title: "", synopsis: "", poster: "", backdrop: "", year: "", rating: "", durationMins: "", releaseDate: "", languages: "English", formats: "2D", published: false });
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;

  useEffect(() => {
    // fetch categories via movies API with dummy id=__cats
    (async () => {
      const r = await fetch('/api/admin/movies?id=__noop', { headers: { 'x-user-email': email || '' } });
      const d = await r.json();
      setCats(d.categories || []);
    })();
  }, []);

  const submit = async () => {
    const body = {
      title: form.title,
      synopsis: form.synopsis,
      poster: form.poster,
      backdrop: form.backdrop,
      year: form.year ? Number(form.year) : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      durationMins: form.durationMins ? Number(form.durationMins) : undefined,
      releaseDate: form.releaseDate || undefined,
      languages: form.languages.split(',').map(s=>s.trim()),
      formats: form.formats.split(',').map(s=>s.trim()),
      published: form.published,
      categoryIds: selected,
    };
    await fetch('/api/admin/movies', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-email': email || '' }, body: JSON.stringify(body) });
    router.push('/admin/movies');
  };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">New movie</h1>
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
            <input value={(form as any)[key as string]} onChange={e=>setForm({...form, [key as string]: e.target.value})} className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" />
          </label>
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={e=>setForm({...form, published: e.target.checked})} />
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
          <button onClick={submit} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40">Create</button>
          <a href="/admin/movies" className="rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20">Cancel</a>
        </div>
      </div>
    </main>
  );
}
