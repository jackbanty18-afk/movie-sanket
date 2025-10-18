"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Array<{ id: number; name: string }>>([]);
  const [name, setName] = useState("");
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;

  const load = async () => {
    const r = await fetch('/api/admin/categories', { headers: { 'x-user-email': email || '' } });
    const d = await r.json();
    setItems(d.categories || []);
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const add = async () => {
    if (!name.trim()) return;
    await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-email': email || '' }, body: JSON.stringify({ name }) });
    setName("");
    await load();
  };

  const del = async (id: number) => {
    await fetch(`/api/admin/categories?id=${id}` , { method: 'DELETE', headers: { 'x-user-email': email || '' } });
    await load();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link href="/admin/movies/" className="text-sm underline">Movies</Link>
      </div>

      <div className="mt-6 flex gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="New category name" className="flex-1 rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" />
        <button onClick={add} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40">Add</button>
      </div>

      <ul className="mt-6 grid gap-2">
        {items.map(c => (
          <li key={c.id} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <span>{c.name}</span>
            <button onClick={()=>del(c.id)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white ring-1 ring-red-500/40">Delete</button>
          </li>
        ))}
        {items.length === 0 && <li className="text-white/70 text-sm">No categories yet.</li>}
      </ul>
    </main>
  );
}
