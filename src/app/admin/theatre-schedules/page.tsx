"use client";

import { useEffect, useState } from "react";

type TheatreLite = { id: string; name: string };
type TheatreSchedule = {
  id: number;
  theatreId: string;
  dayOfWeek: number;
  availableSlots: string;
  operatingHours: string;
  createdAt: string;
};

type ScheduleForm = {
  theatreId: string;
  dayOfWeek: number;
  availableSlots: string[];
  operatingHours: { open: string; close: string };
};

export default function TheatreSchedulesPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  const [theatres, setTheatres] = useState<TheatreLite[]>([]);
  const [selectedTheatre, setSelectedTheatre] = useState<string>('');
  const [schedules, setSchedules] = useState<TheatreSchedule[]>([]);
  
  const [form, setForm] = useState<ScheduleForm>({
    theatreId: '',
    dayOfWeek: 1, // Monday
    availableSlots: ['10:00 AM', '02:00 PM', '06:00 PM', '09:00 PM'],
    operatingHours: { open: '09:00', close: '23:00' }
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const commonTimeSlots = [
    '10:00 AM', '11:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM',
    '07:00 PM', '08:30 PM', '10:00 PM', '11:30 PM'
  ];

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

  const loadSchedules = async (theatreId: string) => {
    if (!theatreId) return;
    
    try {
      const r = await fetch(`/api/admin/theatre-schedules?theatreId=${theatreId}`, {
        headers: { 'x-user-email': email || '' }
      });
      const d = await r.json();
      setSchedules(d.schedules || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };

  useEffect(() => { 
    loadTheatres(); 
  }, []);

  useEffect(() => {
    if (selectedTheatre) {
      loadSchedules(selectedTheatre);
      setForm(prev => ({ ...prev, theatreId: selectedTheatre }));
    }
  }, [selectedTheatre]);

  const save = async () => {
    if (!form.theatreId || form.availableSlots.length === 0) {
      alert('Please select theatre and add time slots');
      return;
    }

    try {
      const payload = {
        theatreId: form.theatreId,
        dayOfWeek: form.dayOfWeek,
        availableSlots: JSON.stringify(form.availableSlots),
        operatingHours: JSON.stringify(form.operatingHours)
      };

      const r = await fetch('/api/admin/theatre-schedules', {
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

      await loadSchedules(form.theatreId);
      
      // Reset form to next day
      setForm(prev => ({
        ...prev,
        dayOfWeek: (prev.dayOfWeek + 1) % 7,
        availableSlots: ['10:00 AM', '02:00 PM', '06:00 PM', '09:00 PM'],
        operatingHours: { open: '09:00', close: '23:00' }
      }));
    } catch (error) {
      alert('Failed to save theatre schedule');
    }
  };

  const deleteSchedule = async (theatreId: string, dayOfWeek: number) => {
    if (!confirm(`Delete schedule for ${dayNames[dayOfWeek]}?`)) return;
    
    try {
      await fetch(`/api/admin/theatre-schedules?theatreId=${theatreId}&dayOfWeek=${dayOfWeek}`, {
        method: 'DELETE',
        headers: { 'x-user-email': email || '' }
      });
      await loadSchedules(theatreId);
    } catch (error) {
      alert('Failed to delete schedule');
    }
  };

  const addTimeSlot = (slot: string) => {
    if (!form.availableSlots.includes(slot)) {
      setForm(prev => ({
        ...prev,
        availableSlots: [...prev.availableSlots, slot].sort()
      }));
    }
  };

  const removeTimeSlot = (slot: string) => {
    setForm(prev => ({
      ...prev,
      availableSlots: prev.availableSlots.filter(s => s !== slot)
    }));
  };

  const addCustomSlot = () => {
    const time = prompt('Enter time (e.g., 11:45 AM):');
    if (time && time.trim()) {
      addTimeSlot(time.trim());
    }
  };

  const loadExistingSchedule = (schedule: TheatreSchedule) => {
    try {
      const slots = JSON.parse(schedule.availableSlots);
      const hours = JSON.parse(schedule.operatingHours);
      
      setForm({
        theatreId: schedule.theatreId,
        dayOfWeek: schedule.dayOfWeek,
        availableSlots: Array.isArray(slots) ? slots : [],
        operatingHours: hours && typeof hours === 'object' ? hours : { open: '09:00', close: '23:00' }
      });
    } catch (error) {
      console.error('Failed to parse schedule data:', error);
    }
  };

  const copyToAllDays = async () => {
    if (!form.theatreId || !confirm('Copy current settings to all days of the week?')) return;
    
    let saved = 0;
    for (let day = 0; day < 7; day++) {
      try {
        const payload = {
          theatreId: form.theatreId,
          dayOfWeek: day,
          availableSlots: JSON.stringify(form.availableSlots),
          operatingHours: JSON.stringify(form.operatingHours)
        };

        const r = await fetch('/api/admin/theatre-schedules', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'x-user-email': email || '' 
          },
          body: JSON.stringify(payload)
        });

        if (r.ok) saved++;
      } catch (error) {
        console.error(`Failed to save schedule for day ${day}:`, error);
      }
    }
    
    alert(`Saved schedule for ${saved} days`);
    await loadSchedules(form.theatreId);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Theatre Schedules</h1>
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
          {/* Schedule Form */}
          <section className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold mb-4">Configure Schedule</h2>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Day of Week</label>
                <select
                  className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                  value={form.dayOfWeek}
                  onChange={e => setForm({...form, dayOfWeek: Number(e.target.value)})}
                >
                  {dayNames.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Operating Hours</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-white/70">Open</label>
                    <input
                      type="time"
                      className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                      value={form.operatingHours.open}
                      onChange={e => setForm({
                        ...form,
                        operatingHours: { ...form.operatingHours, open: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70">Close</label>
                    <input
                      type="time"
                      className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                      value={form.operatingHours.close}
                      onChange={e => setForm({
                        ...form,
                        operatingHours: { ...form.operatingHours, close: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Available Time Slots</label>
                
                {/* Common slots */}
                <div className="mb-3">
                  <div className="text-xs text-white/70 mb-2">Quick Add:</div>
                  <div className="flex flex-wrap gap-2">
                    {commonTimeSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => addTimeSlot(slot)}
                        className={`px-3 py-1 rounded text-xs ${
                          form.availableSlots.includes(slot)
                            ? 'bg-pink-600 text-white cursor-default'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected slots */}
                <div>
                  <div className="text-xs text-white/70 mb-2">Selected ({form.availableSlots.length}):</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.availableSlots.map(slot => (
                      <div key={slot} className="flex items-center gap-1 bg-pink-600 text-white px-2 py-1 rounded text-xs">
                        {slot}
                        <button
                          onClick={() => removeTimeSlot(slot)}
                          className="ml-1 hover:bg-pink-700 rounded px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={addCustomSlot}
                    className="px-3 py-1 rounded-md bg-white/10 text-sm ring-1 ring-white/20"
                  >
                    + Add Custom Time
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={save}
                  className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40"
                >
                  Save {dayNames[form.dayOfWeek]} Schedule
                </button>
                
                <button
                  onClick={copyToAllDays}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-blue-500/40"
                >
                  Copy to All Days
                </button>
              </div>
            </div>
          </section>

          {/* Current Schedules */}
          <section className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold mb-4">Current Schedules</h2>
            
            {schedules.length === 0 && (
              <div className="text-white/70 text-sm">No schedules configured yet.</div>
            )}
            
            <div className="space-y-3">
              {schedules.map(schedule => {
                let slots: string[] = [];
                let hours: any = {};
                
                try {
                  slots = JSON.parse(schedule.availableSlots);
                  hours = JSON.parse(schedule.operatingHours);
                } catch (error) {
                  console.error('Failed to parse schedule:', error);
                }
                
                return (
                  <div key={schedule.id} className="rounded-md bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{dayNames[schedule.dayOfWeek]}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadExistingSchedule(schedule)}
                          className="px-3 py-1 rounded bg-white/10 text-xs ring-1 ring-white/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSchedule(schedule.theatreId, schedule.dayOfWeek)}
                          className="px-3 py-1 rounded bg-red-600 text-xs text-white ring-1 ring-red-500/40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {hours.open && hours.close && (
                      <div className="text-xs text-white/70 mb-2">
                        Hours: {hours.open} - {hours.close}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {slots.map((slot, index) => (
                        <span key={index} className="px-2 py-1 bg-pink-600/20 text-pink-300 rounded text-xs">
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}