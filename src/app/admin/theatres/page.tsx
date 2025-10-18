"use client";

import { useEffect, useState } from "react";

type TheatreItem = { id: string; name: string; city?: string; address?: string };

export default function AdminTheatresPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [items, setItems] = useState<TheatreItem[]>([]);
  const [form, setForm] = useState<TheatreItem | { id?: string; name: string; city?: string; address?: string }>({ name: "" });

  const load = async () => {
    const r = await fetch('/api/admin/theatres-shows?kind=theatres', { headers: { 'x-user-email': email || '' } });
    const d = await r.json();
    setItems(d.theatres || []);
  };
  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const save = async () => {
    const method = form.id ? 'PUT' : 'POST';
    await fetch('/api/admin/theatres-shows?kind=theatres', { method, headers: { 'Content-Type': 'application/json', 'x-user-email': email || '' }, body: JSON.stringify(form) });
    setForm({ name: "" });
    await load();
  };
  const edit = (t: TheatreItem) => setForm({ id: t.id, name: t.name, city: t.city, address: t.address });
  const del = async (id: string) => { await fetch(`/api/admin/theatres-shows?kind=theatres&id=${id}`, { method: 'DELETE', headers: { 'x-user-email': email || '' } }); await load(); };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Theatres</h1>
        <a className="text-sm underline" href="/admin/shows/">Shows</a>
      </div>

      <section className="mt-6 grid gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
          <input className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" placeholder="City" value={form.city||''} onChange={e=>setForm({...form, city: e.target.value})} />
          <input className="sm:col-span-2 rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" placeholder="Address" value={form.address||''} onChange={e=>setForm({...form, address: e.target.value})} />
        </div>
        <div>
          <button onClick={save} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40">{form.id ? 'Update' : 'Add'} theatre</button>
          {form.id && <button onClick={()=>setForm({ name: '' })} className="ml-2 rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20">Cancel</button>}
        </div>
      </section>

      <ul className="mt-6 grid gap-2">
        {items.map(t => (
          <li key={t.id} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-white/70">{[t.city, t.address].filter(Boolean).join(' • ')}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>edit(t)} className="rounded-md bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/20">Edit</button>
              <button onClick={()=>del(t.id)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white ring-1 ring-red-500/40">Delete</button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-white/70 text-sm">No theatres yet.</li>}
      </ul>
    </main>
  );
}
