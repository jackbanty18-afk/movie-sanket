"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = window.localStorage.getItem('mdtalkies_profile_v1');
        const p = raw ? JSON.parse(raw) : null;
        if (!p?.email) { setOk(false); return; }
        const r = await fetch(`/api/auth/roles?email=${encodeURIComponent(p.email)}`);
        const data = await r.json();
        setOk(Array.isArray(data.roles) && data.roles.includes('admin'));
      } catch { setOk(false); }
    })();
  }, []);

  if (ok === null) return <main className="mx-auto max-w-7xl p-6">Checking access…</main>;
  if (!ok) {
    if (typeof window !== 'undefined') router.replace('/');
    return <main className="mx-auto max-w-7xl p-6">Not authorized.</main>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-white/70">Welcome, admin. Use the sidebar to manage movies, shows, theatres, users, bookings, and notifications.</p>
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Core Management</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a href="/admin/movies" className="block rounded-md bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
            <h3 className="font-semibold">Movies</h3>
            <p className="text-sm text-white/70">Add and edit movies</p>
          </a>
          <a href="/admin/shows" className="block rounded-md bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
            <h3 className="font-semibold">Shows</h3>
            <p className="text-sm text-white/70">Schedule individual shows</p>
          </a>
          <a href="/admin/theatres" className="block rounded-md bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
            <h3 className="font-semibold">Theatres</h3>
            <p className="text-sm text-white/70">Manage theatre locations</p>
          </a>
          <a href="/admin/categories" className="block rounded-md bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
            <h3 className="font-semibold">Categories</h3>
            <p className="text-sm text-white/70">Movie genres & categories</p>
          </a>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">👥 User & Booking Management</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a href="/admin/users" className="block rounded-md bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-4 ring-1 ring-blue-500/30 hover:from-blue-500/30 hover:to-indigo-500/30">
            <h3 className="font-semibold text-blue-100">👤 User Management</h3>
            <p className="text-sm text-blue-200/70">Manage users, roles, bans and view booking history</p>
          </a>
          <a href="/admin/bookings" className="block rounded-md bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-4 ring-1 ring-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30">
            <h3 className="font-semibold text-green-100">🎫 Booking Management</h3>
            <p className="text-sm text-green-200/70">Handle bookings, refunds, cancellations and seat changes</p>
          </a>
          <a href="/admin/notifications" className="block rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4 ring-1 ring-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30">
            <h3 className="font-semibold text-purple-100">🔔 Notifications</h3>
            <p className="text-sm text-purple-200/70">Create templates, compose campaigns and send notifications</p>
          </a>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">🚀 Advanced Tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a href="/admin/schedule-builder" className="block rounded-md bg-gradient-to-br from-pink-500/20 to-purple-500/20 p-4 ring-1 ring-pink-500/30 hover:from-pink-500/30 hover:to-purple-500/30">
            <h3 className="font-semibold text-pink-100">📅 Schedule Builder</h3>
            <p className="text-sm text-pink-200/70">Bulk schedule creation with recurring patterns</p>
          </a>
          <a href="/admin/theatre-schedules" className="block rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 ring-1 ring-blue-500/30 hover:from-blue-500/30 hover:to-cyan-500/30">
            <h3 className="font-semibold text-blue-100">🕒 Theatre Schedules</h3>
            <p className="text-sm text-blue-200/70">Configure per-theatre operating hours & time slots</p>
          </a>
          <a href="/admin/pricing-tiers" className="block rounded-md bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-4 ring-1 ring-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30">
            <h3 className="font-semibold text-green-100">💰 Pricing Tiers</h3>
            <p className="text-sm text-green-200/70">Manage pricing structures & multipliers</p>
          </a>
          <a href="/admin/seat-templates" className="block rounded-md bg-gradient-to-br from-purple-500/20 to-indigo-500/20 p-4 ring-1 ring-purple-500/30 hover:from-purple-500/30 hover:to-indigo-500/30">
            <h3 className="font-semibold text-purple-100">🎭 Seat Templates</h3>
            <p className="text-sm text-purple-200/70">Design custom seat layouts for each theatre</p>
          </a>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">📊 Monitoring & Analytics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a href="/admin/logs" className="block rounded-md bg-gradient-to-br from-red-500/20 to-orange-500/20 p-4 ring-1 ring-red-500/30 hover:from-red-500/30 hover:to-orange-500/30">
            <h3 className="font-semibold text-red-100">🔍 System Logs</h3>
            <p className="text-sm text-red-200/70">Monitor access logs, application events and audit trails</p>
          </a>
        </div>
      </section>
      </main>
    </div>
  );
}
