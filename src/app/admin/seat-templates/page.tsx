"use client";

import { useEffect, useState } from "react";

type TheatreLite = { id: string; name: string };
type SeatTemplate = {
  id: number;
  theatreId: string;
  name: string;
  layout: string;
  totalSeats: number;
  normalSeats: number;
  executiveSeats: number;
  premiumSeats: number;
  vipSeats: number;
  createdAt: string;
  updatedAt: string;
};

type SeatLayout = {
  rows: SeatRow[];
  metadata: {
    totalSeats: number;
    tierCounts: Record<string, number>;
  };
};

type SeatRow = {
  id: string;
  tier: 'NORMAL' | 'EXECUTIVE' | 'PREMIUM' | 'VIP';
  seatCount: number;
  gap?: number; // Gap after this row
};

type TemplateForm = {
  theatreId: string;
  name: string;
  layout: SeatLayout;
};

export default function SeatTemplatesPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [theatres, setTheatres] = useState<TheatreLite[]>([]);
  const [selectedTheatre, setSelectedTheatre] = useState<string>('');
  const [template, setTemplate] = useState<SeatTemplate | null>(null);
  
  const [form, setForm] = useState<TemplateForm>({
    theatreId: '',
    name: '',
    layout: {
      rows: [
        { id: 'K', tier: 'VIP', seatCount: 14 },
        { id: 'J', tier: 'VIP', seatCount: 14, gap: 2 },
        { id: 'H', tier: 'PREMIUM', seatCount: 22 },
        { id: 'G', tier: 'PREMIUM', seatCount: 22 },
        { id: 'F', tier: 'PREMIUM', seatCount: 22 },
        { id: 'E', tier: 'PREMIUM', seatCount: 22, gap: 2 },
        { id: 'D', tier: 'EXECUTIVE', seatCount: 22 },
        { id: 'C', tier: 'EXECUTIVE', seatCount: 22, gap: 2 },
        { id: 'B', tier: 'NORMAL', seatCount: 18 },
        { id: 'A', tier: 'NORMAL', seatCount: 18 },
      ],
      metadata: { totalSeats: 0, tierCounts: {} }
    }
  });

  const [presetTemplates] = useState([
    {
      name: 'Standard Cinema (200 seats)',
      layout: {
        rows: [
          { id: 'K', tier: 'VIP', seatCount: 12 },
          { id: 'J', tier: 'VIP', seatCount: 12, gap: 2 },
          { id: 'H', tier: 'PREMIUM', seatCount: 18 },
          { id: 'G', tier: 'PREMIUM', seatCount: 18 },
          { id: 'F', tier: 'PREMIUM', seatCount: 18, gap: 2 },
          { id: 'E', tier: 'EXECUTIVE', seatCount: 20 },
          { id: 'D', tier: 'EXECUTIVE', seatCount: 20 },
          { id: 'C', tier: 'EXECUTIVE', seatCount: 20, gap: 2 },
          { id: 'B', tier: 'NORMAL', seatCount: 22 },
          { id: 'A', tier: 'NORMAL', seatCount: 22 },
        ],
        metadata: { totalSeats: 0, tierCounts: {} }
      }
    },
    {
      name: 'IMAX Cinema (300 seats)',
      layout: {
        rows: [
          { id: 'M', tier: 'VIP', seatCount: 16 },
          { id: 'L', tier: 'VIP', seatCount: 16 },
          { id: 'K', tier: 'VIP', seatCount: 16, gap: 2 },
          { id: 'J', tier: 'PREMIUM', seatCount: 24 },
          { id: 'H', tier: 'PREMIUM', seatCount: 24 },
          { id: 'G', tier: 'PREMIUM', seatCount: 24 },
          { id: 'F', tier: 'PREMIUM', seatCount: 24, gap: 2 },
          { id: 'E', tier: 'EXECUTIVE', seatCount: 26 },
          { id: 'D', tier: 'EXECUTIVE', seatCount: 26 },
          { id: 'C', tier: 'EXECUTIVE', seatCount: 26, gap: 2 },
          { id: 'B', tier: 'NORMAL', seatCount: 28 },
          { id: 'A', tier: 'NORMAL', seatCount: 28 },
        ],
        metadata: { totalSeats: 0, tierCounts: {} }
      }
    }
  ]);

  const loadTheatres = async () => {
    try {
      const r = await fetch('/api/admin/theatres-shows?kind=theatres', { 
        headers: { 'x-user-email': email || '' } 
      });
      const d = await r.json();
      setTheatres(d.theatres || []);
    } catch (error) {
      console.error('Failed to load theatres:', error);
    }
  };

  const loadTemplate = async (theatreId: string) => {
    if (!theatreId) return;
    
    try {
      const r = await fetch(`/api/admin/seat-templates?theatreId=${theatreId}`, {
        headers: { 'x-user-email': email || '' }
      });
      const d = await r.json();
      
      if (d.template) {
        setTemplate(d.template);
        try {
          const layout = JSON.parse(d.template.layout);
          setForm({
            theatreId: d.template.theatreId,
            name: d.template.name,
            layout: layout
          });
        } catch (error) {
          console.error('Failed to parse layout:', error);
        }
      } else {
        setTemplate(null);
        setForm(prev => ({ ...prev, theatreId, name: `${theatres.find(t => t.id === theatreId)?.name || 'Theatre'} Layout` }));
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  useEffect(() => { loadTheatres(); }, []);

  useEffect(() => {
    if (selectedTheatre) {
      loadTemplate(selectedTheatre);
    }
  }, [selectedTheatre, theatres]);

  // Calculate metadata whenever layout changes
  useEffect(() => {
    const tierCounts = { NORMAL: 0, EXECUTIVE: 0, PREMIUM: 0, VIP: 0 };
    let totalSeats = 0;
    
    form.layout.rows.forEach(row => {
      tierCounts[row.tier] += row.seatCount;
      totalSeats += row.seatCount;
    });
    
    setForm(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        metadata: { totalSeats, tierCounts }
      }
    }));
  }, [form.layout.rows]);

  const save = async () => {
    if (!form.theatreId || !form.name) {
      alert('Please select theatre and provide a name');
      return;
    }

    try {
      const payload = {
        theatreId: form.theatreId,
        name: form.name,
        layout: JSON.stringify(form.layout),
        normalSeats: form.layout.metadata.tierCounts.NORMAL || 0,
        executiveSeats: form.layout.metadata.tierCounts.EXECUTIVE || 0,
        premiumSeats: form.layout.metadata.tierCounts.PREMIUM || 0,
        vipSeats: form.layout.metadata.tierCounts.VIP || 0
      };

      const r = await fetch('/api/admin/seat-templates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-user-email': email || '' 
        },
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Failed to save: ${err?.error || r.statusText}`);
        return;
      }

      alert('Template saved successfully!');
      await loadTemplate(form.theatreId);
    } catch (error) {
      alert('Failed to save seat template');
    }
  };

  const deleteTemplate = async () => {
    if (!template || !confirm('Delete this seat template?')) return;
    
    try {
      await fetch(`/api/admin/seat-templates?theatreId=${template.theatreId}`, {
        method: 'DELETE',
        headers: { 'x-user-email': email || '' }
      });
      
      setTemplate(null);
      setForm(prev => ({
        ...prev,
        name: `${theatres.find(t => t.id === selectedTheatre)?.name || 'Theatre'} Layout`,
        layout: {
          rows: [
            { id: 'K', tier: 'VIP', seatCount: 14 },
            { id: 'J', tier: 'VIP', seatCount: 14, gap: 2 },
            { id: 'H', tier: 'PREMIUM', seatCount: 22 },
            { id: 'G', tier: 'PREMIUM', seatCount: 22 },
            { id: 'F', tier: 'PREMIUM', seatCount: 22 },
            { id: 'E', tier: 'PREMIUM', seatCount: 22, gap: 2 },
            { id: 'D', tier: 'EXECUTIVE', seatCount: 22 },
            { id: 'C', tier: 'EXECUTIVE', seatCount: 22, gap: 2 },
            { id: 'B', tier: 'NORMAL', seatCount: 18 },
            { id: 'A', tier: 'NORMAL', seatCount: 18 },
          ],
          metadata: { totalSeats: 0, tierCounts: {} }
        }
      }));
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  const addRow = () => {
    const newRowId = String.fromCharCode(65 + form.layout.rows.length); // A, B, C...
    setForm(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: [...prev.layout.rows, { id: newRowId, tier: 'NORMAL', seatCount: 20 }]
      }
    }));
  };

  const updateRow = (index: number, updates: Partial<SeatRow>) => {
    setForm(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: prev.layout.rows.map((row, i) => i === index ? { ...row, ...updates } : row)
      }
    }));
  };

  const removeRow = (index: number) => {
    setForm(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: prev.layout.rows.filter((_, i) => i !== index)
      }
    }));
  };

  const loadPreset = (preset: any) => {
    setForm(prev => ({
      ...prev,
      layout: {
        ...preset.layout,
        metadata: { totalSeats: 0, tierCounts: {} } // Will be recalculated
      }
    }));
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return 'bg-purple-600';
      case 'PREMIUM': return 'bg-blue-600';
      case 'EXECUTIVE': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seat Templates</h1>
        <a className="text-sm underline" href="/admin">Back to Admin</a>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">Select Theatre</label>
        <select
          className="w-full max-w-md rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
          value={selectedTheatre}
          onChange={e => setSelectedTheatre(e.target.value)}
        >
          <option value="">Choose a theatre</option>
          {theatres.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTheatre && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Template Form */}
          <section className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {template ? 'Edit Template' : 'Create Template'}
              </h2>
              {template && (
                <button
                  onClick={deleteTemplate}
                  className="px-3 py-1 rounded bg-red-600 text-xs text-white ring-1 ring-red-500/40"
                >
                  Delete
                </button>
              )}
            </div>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <input
                  type="text"
                  className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g., Main Hall Layout"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quick Presets</label>
                <div className="flex gap-2 mb-4">
                  {presetTemplates.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => loadPreset(preset)}
                      className="px-3 py-1 rounded bg-white/10 text-xs ring-1 ring-white/20 hover:bg-white/20"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <div className="bg-gray-600/20 px-3 py-2 rounded">
                  <div className="text-xs text-white/70">Normal</div>
                  <div className="font-semibold">{form.layout.metadata.tierCounts?.NORMAL || 0}</div>
                </div>
                <div className="bg-green-600/20 px-3 py-2 rounded">
                  <div className="text-xs text-white/70">Executive</div>
                  <div className="font-semibold">{form.layout.metadata.tierCounts?.EXECUTIVE || 0}</div>
                </div>
                <div className="bg-blue-600/20 px-3 py-2 rounded">
                  <div className="text-xs text-white/70">Premium</div>
                  <div className="font-semibold">{form.layout.metadata.tierCounts?.PREMIUM || 0}</div>
                </div>
                <div className="bg-purple-600/20 px-3 py-2 rounded">
                  <div className="text-xs text-white/70">VIP</div>
                  <div className="font-semibold">{form.layout.metadata.tierCounts?.VIP || 0}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Seat Layout ({form.layout.metadata.totalSeats} seats)</label>
                  <button
                    onClick={addRow}
                    className="px-3 py-1 rounded bg-white/10 text-xs ring-1 ring-white/20"
                  >
                    + Add Row
                  </button>
                </div>
                
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {form.layout.rows.map((row, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-5 items-center">
                      <input
                        type="text"
                        className="rounded bg-white/10 px-2 py-1 text-sm ring-1 ring-white/10"
                        value={row.id}
                        onChange={e => updateRow(index, { id: e.target.value })}
                        placeholder="Row"
                      />
                      
                      <select
                        className="rounded bg-white/10 px-2 py-1 text-sm ring-1 ring-white/10"
                        value={row.tier}
                        onChange={e => updateRow(index, { tier: e.target.value as any })}
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="EXECUTIVE">Executive</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="VIP">VIP</option>
                      </select>
                      
                      <input
                        type="number"
                        className="rounded bg-white/10 px-2 py-1 text-sm ring-1 ring-white/10"
                        value={row.seatCount}
                        onChange={e => updateRow(index, { seatCount: parseInt(e.target.value) || 0 })}
                        min="1"
                        max="50"
                      />
                      
                      <input
                        type="number"
                        className="rounded bg-white/10 px-2 py-1 text-sm ring-1 ring-white/10"
                        value={row.gap || 0}
                        onChange={e => updateRow(index, { gap: parseInt(e.target.value) || 0 })}
                        placeholder="Gap"
                        min="0"
                        max="10"
                      />
                      
                      <button
                        onClick={() => removeRow(index)}
                        className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={save}
                className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40"
              >
                {template ? 'Update' : 'Create'} Template
              </button>
            </div>
          </section>

          {/* Visual Preview */}
          <section className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold mb-4">Layout Preview</h2>
            
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-6">
              {/* Screen */}
              <div className="w-full h-2 bg-white/20 rounded mb-8 mx-auto"></div>
              <div className="text-center text-xs text-white/70 mb-8">SCREEN</div>
              
              {/* Seats */}
              <div className="space-y-1">
                {form.layout.rows.map((row, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-6 text-xs text-white/60 text-center">{row.id}</div>
                      <div className="flex gap-1">
                        {Array.from({ length: row.seatCount }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-sm ${getTierColor(row.tier)}`}
                            title={`${row.id}${i+1} - ${row.tier}`}
                          />
                        ))}
                      </div>
                    </div>
                    {row.gap && row.gap > 0 && (
                      <div style={{ height: `${row.gap * 4}px` }} />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-6 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-gray-600" />
                  Normal
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-green-600" />
                  Executive
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-blue-600" />
                  Premium
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-purple-600" />
                  VIP
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}