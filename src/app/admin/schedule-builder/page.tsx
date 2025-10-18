"use client";

import { useEffect, useState } from "react";

type MovieLite = { id: string; title: string };
type TheatreLite = { id: string; name: string };
type ShowAdmin = { 
  id: string; 
  movieId: string; 
  theatreId: string; 
  dateKey: string; 
  time: string; 
  format?: string | null; 
  language?: string | null; 
  prices: string; 
  published: number; 
  createdAt: string; 
  updatedAt: string; 
};

type ScheduleForm = {
  movieId: string;
  theatreId: string;
  startDate: string;
  endDate: string;
  times: string[];
  recurringDays: number[]; // 0=Sunday, 1=Monday, etc.
  format?: string;
  language?: string;
  prices: Record<string, number>;
  published: boolean;
};

type BulkOperationForm = {
  operation: 'delete' | 'publish' | 'unpublish';
  filters: {
    movieId?: string;
    theatreId?: string;
    dateRange?: { start: string; end: string };
  };
};

export default function ScheduleBuilderPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [movies, setMovies] = useState<MovieLite[]>([]);
  const [theatres, setTheatres] = useState<TheatreLite[]>([]);
  const [shows, setShows] = useState<ShowAdmin[]>([]);
  
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    movieId: '',
    theatreId: '',
    startDate: '',
    endDate: '',
    times: ['10:00 AM', '02:00 PM', '06:00 PM', '09:00 PM'],
    recurringDays: [1, 2, 3, 4, 5, 6, 0], // All days by default
    format: '',
    language: '',
    prices: { NORMAL: 200, EXECUTIVE: 220, PREMIUM: 250, VIP: 400 },
    published: true
  });

  const [bulkForm, setBulkForm] = useState<BulkOperationForm>({
    operation: 'delete',
    filters: {}
  });

  const [selectedDates, setSelectedDates] = useState<string[]>([]);

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

  // Generate dates based on start/end date and recurring days
  const generateDates = () => {
    if (!scheduleForm.startDate || !scheduleForm.endDate) return [];
    
    const start = new Date(scheduleForm.startDate + 'T00:00:00');
    const end = new Date(scheduleForm.endDate + 'T00:00:00');
    const dates: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (scheduleForm.recurringDays.includes(dayOfWeek)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  const createBulkSchedule = async () => {
    if (!scheduleForm.movieId || !scheduleForm.theatreId || !scheduleForm.startDate || !scheduleForm.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const dates = generateDates();
    if (dates.length === 0) {
      alert('No dates match the selected criteria');
      return;
    }

    let created = 0;
    for (const dateKey of dates) {
      for (const time of scheduleForm.times) {
        if (!time.trim()) continue;
        
        const showData = {
          movieId: scheduleForm.movieId,
          theatreId: scheduleForm.theatreId,
          dateKey,
          time: time.trim(),
          format: scheduleForm.format || null,
          language: scheduleForm.language || null,
          prices: scheduleForm.prices,
          published: scheduleForm.published ? 1 : 0
        };

        try {
          const r = await fetch('/api/admin/theatres-shows?kind=shows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-email': email || '' },
            body: JSON.stringify(showData)
          });

          if (r.ok) created++;
        } catch (error) {
          console.error('Failed to create show:', error);
        }
      }
    }

    alert(`Created ${created} shows across ${dates.length} dates`);
    await loadShows();
  };

  const performBulkOperation = async () => {
    if (!confirm(`Are you sure you want to ${bulkForm.operation} the filtered shows?`)) return;

    // This would need more sophisticated filtering logic
    alert('Bulk operations feature coming soon');
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleRecurringDay = (day: number) => {
    setScheduleForm(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter(d => d !== day)
        : [...prev.recurringDays, day]
    }));
  };

  const addTimeSlot = () => {
    setScheduleForm(prev => ({
      ...prev,
      times: [...prev.times, '']
    }));
  };

  const updateTimeSlot = (index: number, value: string) => {
    setScheduleForm(prev => ({
      ...prev,
      times: prev.times.map((time, i) => i === index ? value : time)
    }));
  };

  const removeTimeSlot = (index: number) => {
    setScheduleForm(prev => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index)
    }));
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule Builder</h1>
        <a className="text-sm underline" href="/admin/shows">Regular Shows</a>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Bulk Schedule Creator */}
        <section className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold mb-4">Create Bulk Schedule</h2>
          
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <select 
                className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                value={scheduleForm.movieId} 
                onChange={e=>setScheduleForm({...scheduleForm, movieId: e.target.value})}
              >
                <option value="">Select movie</option>
                {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              
              <select 
                className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                value={scheduleForm.theatreId} 
                onChange={e=>setScheduleForm({...scheduleForm, theatreId: e.target.value})}
              >
                <option value="">Select theatre</option>
                {theatres.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input 
                  type="date" 
                  className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                  value={scheduleForm.startDate} 
                  onChange={e=>setScheduleForm({...scheduleForm, startDate: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input 
                  type="date" 
                  className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                  value={scheduleForm.endDate} 
                  onChange={e=>setScheduleForm({...scheduleForm, endDate: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Recurring Days</label>
              <div className="flex gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => toggleRecurringDay(index)}
                    className={`px-3 py-1 rounded text-xs ${
                      scheduleForm.recurringDays.includes(index)
                        ? 'bg-pink-600 text-white'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Show Times</label>
              <div className="space-y-2">
                {scheduleForm.times.map((time, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                      value={time}
                      onChange={e => updateTimeSlot(index, e.target.value)}
                      placeholder="e.g., 10:00 AM"
                    />
                    <button
                      onClick={() => removeTimeSlot(index)}
                      className="px-3 py-2 rounded-md bg-red-600 text-white text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={addTimeSlot}
                  className="px-3 py-1 rounded-md bg-white/10 text-sm ring-1 ring-white/20"
                >
                  + Add Time
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input 
                placeholder="Format (2D/3D/IMAX)" 
                className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                value={scheduleForm.format} 
                onChange={e=>setScheduleForm({...scheduleForm, format: e.target.value})} 
              />
              <input 
                placeholder="Language (ENG/HIN)" 
                className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                value={scheduleForm.language} 
                onChange={e=>setScheduleForm({...scheduleForm, language: e.target.value})} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prices (JSON)</label>
              <textarea 
                className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                rows={3} 
                value={JSON.stringify(scheduleForm.prices, null, 2)} 
                onChange={e=>{ 
                  try{ 
                    setScheduleForm({...scheduleForm, prices: JSON.parse(e.target.value)});
                  } catch{}
                }} 
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={scheduleForm.published} 
                onChange={e=>setScheduleForm({...scheduleForm, published: e.target.checked})} 
              />
              <span>Published</span>
            </label>

            <button
              onClick={createBulkSchedule}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40"
            >
              Create Schedule ({generateDates().length} dates × {scheduleForm.times.filter(t => t.trim()).length} times)
            </button>
          </div>
        </section>

        {/* Bulk Operations */}
        <section className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold mb-4">Bulk Operations</h2>
          
          <div className="grid gap-4">
            <select 
              className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
              value={bulkForm.operation} 
              onChange={e=>setBulkForm({...bulkForm, operation: e.target.value as any})}
            >
              <option value="delete">Delete Shows</option>
              <option value="publish">Publish Shows</option>
              <option value="unpublish">Unpublish Shows</option>
            </select>

            <div className="grid gap-3 sm:grid-cols-2">
              <select 
                className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                value={bulkForm.filters.movieId || ''} 
                onChange={e=>setBulkForm({...bulkForm, filters: {...bulkForm.filters, movieId: e.target.value || undefined}})}
              >
                <option value="">All movies</option>
                {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              
              <select 
                className="rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10" 
                value={bulkForm.filters.theatreId || ''} 
                onChange={e=>setBulkForm({...bulkForm, filters: {...bulkForm.filters, theatreId: e.target.value || undefined}})}
              >
                <option value="">All theatres</option>
                {theatres.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <button
              onClick={performBulkOperation}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-amber-500/40"
            >
              {bulkForm.operation.charAt(0).toUpperCase() + bulkForm.operation.slice(1)} Filtered Shows
            </button>
          </div>
        </section>
      </div>

      {/* Recent Shows */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recent Shows ({shows.length} total)</h2>
        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {shows.slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <div className="text-sm">
                <div><span className="font-semibold">{s.movieId}</span> • <span>{s.theatreId}</span></div>
                <div className="text-white/70">{s.dateKey} • {s.time} • {s.language || ''} {s.format || ''}</div>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${s.published ? 'bg-green-600' : 'bg-red-600'}`}>
                {s.published ? 'Published' : 'Draft'}
              </div>
            </div>
          ))}
          {shows.length === 0 && <div className="text-white/70 text-sm">No shows yet.</div>}
        </div>
      </section>
    </main>
  );
}