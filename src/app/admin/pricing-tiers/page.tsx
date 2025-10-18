"use client";

import { useEffect, useState } from "react";

type PricingTier = {
  id: number;
  name: string;
  description?: string;
  baseMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  createdAt: string;
};

type PricingTierForm = {
  id?: number;
  name: string;
  description?: string;
  baseMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
};

export default function PricingTiersPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [form, setForm] = useState<PricingTierForm>({
    name: '',
    description: '',
    baseMultiplier: 1.0,
    weekendMultiplier: 1.2,
    holidayMultiplier: 1.5
  });

  const loadTiers = async () => {
    try {
      const r = await fetch('/api/admin/pricing-tiers', { headers: { 'x-user-email': email || '' } });
      const d = await r.json();
      setTiers(d.tiers || []);
    } catch (error) {
      console.error('Failed to load pricing tiers:', error);
    }
  };

  useEffect(() => { loadTiers(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const save = async () => {
    if (!form.name) {
      alert('Name is required');
      return;
    }

    const method = form.id ? 'PUT' : 'POST';
    try {
      const r = await fetch('/api/admin/pricing-tiers', {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-email': email || '' },
        body: JSON.stringify(form)
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Failed to save: ${err?.error || r.statusText}`);
        return;
      }

      setForm({
        name: '',
        description: '',
        baseMultiplier: 1.0,
        weekendMultiplier: 1.2,
        holidayMultiplier: 1.5
      });
      await loadTiers();
    } catch (error) {
      alert('Failed to save pricing tier');
    }
  };

  const edit = (tier: PricingTier) => {
    setForm({
      id: tier.id,
      name: tier.name,
      description: tier.description || '',
      baseMultiplier: tier.baseMultiplier,
      weekendMultiplier: tier.weekendMultiplier,
      holidayMultiplier: tier.holidayMultiplier
    });
  };

  const del = async (id: number) => {
    if (!confirm('Are you sure you want to delete this pricing tier?')) return;
    
    try {
      await fetch(`/api/admin/pricing-tiers?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': email || '' }
      });
      await loadTiers();
    } catch (error) {
      alert('Failed to delete pricing tier');
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pricing Tiers</h1>
        <a className="text-sm underline" href="/admin">Back to Admin</a>
      </div>

      <section className="mt-6 grid gap-4">
        <div className="rounded-md bg-white/5 p-4 ring-1 ring-white/10">
          <h3 className="text-lg font-semibold mb-4">{form.id ? 'Edit' : 'Create'} Pricing Tier</h3>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g., Standard, Premium, VIP"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Optional description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Base Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                value={form.baseMultiplier}
                onChange={e => setForm({...form, baseMultiplier: parseFloat(e.target.value) || 1.0})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Weekend Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                value={form.weekendMultiplier}
                onChange={e => setForm({...form, weekendMultiplier: parseFloat(e.target.value) || 1.2})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Holiday Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                value={form.holidayMultiplier}
                onChange={e => setForm({...form, holidayMultiplier: parseFloat(e.target.value) || 1.5})}
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40"
            >
              {form.id ? 'Update' : 'Create'} Tier
            </button>
            {form.id && (
              <button
                onClick={() => setForm({
                  name: '',
                  description: '',
                  baseMultiplier: 1.0,
                  weekendMultiplier: 1.2,
                  holidayMultiplier: 1.5
                })}
                className="rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Existing Pricing Tiers</h2>
        
        {tiers.length === 0 && (
          <div className="text-white/70 text-sm">No pricing tiers yet.</div>
        )}
        
        <div className="grid gap-3">
          {tiers.map(tier => (
            <div key={tier.id} className="flex items-center justify-between rounded-md bg-white/5 px-4 py-3 ring-1 ring-white/10">
              <div>
                <div className="font-semibold">{tier.name}</div>
                {tier.description && (
                  <div className="text-sm text-white/70">{tier.description}</div>
                )}
                <div className="text-xs text-white/60">
                  Base: {tier.baseMultiplier}x • Weekend: {tier.weekendMultiplier}x • Holiday: {tier.holidayMultiplier}x
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => edit(tier)}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/20"
                >
                  Edit
                </button>
                <button
                  onClick={() => del(tier.id)}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white ring-1 ring-red-500/40"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}