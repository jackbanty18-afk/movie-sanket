"use client";

import { useEffect, useState } from "react";

type MovieLite = { id: string; title: string };
type TheatreLite = { id: string; name: string };
type ShowAdmin = { id: string; movieId: string; theatreId: string; dateKey: string; time: string; format?: string | null; language?: string | null; prices: string; published: number; createdAt: string; updatedAt: string };

type ShowForm = { id?: string; movieId?: string; theatreId?: string; dateKey?: string; time?: string; format?: string; language?: string; prices: Record<string, number>; published?: number };

export default function AdminShowsPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [movies, setMovies] = useState<MovieLite[]>([]);
  const [theatres, setTheatres] = useState<TheatreLite[]>([]);
  const [shows, setShows] = useState<ShowAdmin[]>([]);
  const [form, setForm] = useState<ShowForm>({ published: 1, prices: { NORMAL: 200, EXECUTIVE: 220, PREMIUM: 250, VIP: 400 } });

  const loadBase = async () => {
    const [m, t] = await Promise.all([
      fetch('/api/admin/theatres-shows?kind=movies', { headers: { 'x-user-email': email || '' } }).then(r=>r.json()),
      fetch('/api/admin/theatres-shows?kind=theatres', { headers: { 'x-user-email': email || '' } }).then(r=>r.json()),
    ]);
    setMovies(m.movies || []);
    setTheatres(t.theatres || []);
  };
  const loadShows = async () => {
    const r = await fetch('/api/admin/theatres-shows?kind=shows', { headers: { 'x-user-email': email || '' } });
    const d = await r.json();
    setShows(d.shows || []);
  };
  useEffect(() => { loadBase(); loadShows(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const save = async () => {
    // Basic client-side validation
    if (!form.movieId || !form.theatreId || !form.dateKey || !form.time) {
      alert('Please select movie, theatre, date and time');
      return;
    }
    const method = form.id ? 'PUT' : 'POST';
    const payload = { ...form, prices: form.prices } as ShowForm;
    const r = await fetch('/api/admin/theatres-shows?kind=shows', { method, headers: { 'Content-Type': 'application/json', 'x-user-email': email || '' }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(`Failed to save: ${err?.error || r.statusText}`);
      return;
    }
    setForm({ published: 1, prices: { NORMAL: 200, EXECUTIVE: 220, PREMIUM: 250, VIP: 400 } });
    await loadShows();
  };
  const edit = (s: ShowAdmin) => setForm({ id: s.id, movieId: s.movieId, theatreId: s.theatreId, dateKey: s.dateKey, time: s.time, format: s.format || undefined, language: s.language || undefined, prices: JSON.parse(s.prices), published: s.published });
  const del = async (id: string) => { await fetch(`/api/admin/theatres-shows?kind=shows&id=${id}`, { method: 'DELETE', headers: { 'x-user-email': email || '' } }); await loadShows(); };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shows</h1>
        <a className="text-sm underline" href="/admin/theatres/">Theatres</a>
      </div>

      <section className="mt-6 grid gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" value={form.movieId||''} onChange={e=>setForm({...form, movieId: e.target.value})}>
            <option value="">Select movie</option>
            {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <select className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" value={form.theatreId||''} onChange={e=>setForm({...form, theatreId: e.target.value})}>
            <option value="">Select theatre</option>
            {theatres.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" value={form.dateKey||''} onChange={e=>setForm({...form, dateKey: e.target.value})} />
          <input placeholder="Time (e.g. 08:00 PM)" className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" value={form.time||''} onChange={e=>setForm({...form, time: e.target.value})} />
          <input placeholder="Format (2D/3D/IMAX)" className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" value={form.format||''} onChange={e=>setForm({...form, format: e.target.value})} />
          <input placeholder="Language (ENG/HIN)" className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" value={form.language||''} onChange={e=>setForm({...form, language: e.target.value})} />
          <textarea className="sm:col-span-2 rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" rows={3} value={JSON.stringify(form.prices)} onChange={e=>{ try{ setForm({...form, prices: JSON.parse(e.target.value)});} catch{}}} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.published} onChange={e=>setForm({...form, published: e.target.checked ? 1 : 0})} />
          <span>Published</span>
        </label>
        <div>
          <button onClick={save} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40">{form.id ? 'Update' : 'Create'} show</button>
          {form.id && <button onClick={()=>setForm({ published: 1, prices: { NORMAL: 200, EXECUTIVE: 220, PREMIUM: 250, VIP: 400 } })} className="ml-2 rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20">Cancel</button>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Existing shows</h2>
        <div className="mt-3 grid gap-2">
          {shows.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <div className="text-sm">
                <div><span className="font-semibold">{s.movieId}</span> • <span>{s.theatreId}</span></div>
                <div className="text-white/70">{s.dateKey} • {s.time} • {s.language || ''} {s.format || ''}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>edit(s)} className="rounded-md bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/20">Edit</button>
                <button onClick={()=>del(s.id)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white ring-1 ring-red-500/40">Delete</button>
              </div>
            </div>
          ))}
          {shows.length === 0 && <div className="text-white/70 text-sm">No shows yet.</div>}
        </div>
      </section>
    </main>
  );
}
