"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTicket, type BookingDraft, type Ticket } from "@/lib/booking";
import { CreditCard, Landmark, SmartphoneNfc, CheckCircle2 } from "lucide-react";

function decodeDraft(sp: URLSearchParams): BookingDraft | null {
  const d = sp.get("d");
  if (!d) return null;
  try {
    const json = decodeURIComponent(atob(d));
    return JSON.parse(json) as BookingDraft;
  } catch {
    return null;
  }
}

import { getProfile } from "@/lib/user";

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const draft = useMemo(() => decodeDraft(params), [params]);

  const [method, setMethod] = useState<"UPI" | "CARD" | "NET" | null>("UPI");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!draft) {
    return (
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
          <h1 className="text-xl font-bold">Checkout</h1>
          <p className="mt-2 text-white/70">Invalid or missing booking details. Go back and select seats again.</p>
          <button onClick={() => router.push("/")} className="mt-4 rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">Home</button>
        </div>
      </main>
    );
  }

  const fee = Math.round(Math.max(10, draft.total * 0.05));
  const payable = draft.total + fee;

  const confirm = async () => {
    setError(null);
    if (method === "UPI" && (!upi || !/^[\w.\-]+@[\w\-]+$/.test(upi))) {
      setError("Enter a valid UPI ID (e.g., name@bank)");
      return;
    }
    if (method === "CARD" && (card.number.replace(/\s/g, "").length < 12 || !card.name || !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(card.expiry) || card.cvv.length < 3)) {
      setError("Enter valid card details");
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1000)); // simulate gateway
    const ticketId = `MDT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const profile = getProfile();
    const ticket: Ticket = { ...draft, ticketId, purchasedAt: new Date().toISOString(), userEmail: profile?.email } as Ticket;
    saveTicket(ticket);
    try { await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ticket) }); } catch {}
    try { await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: `ntf-${Date.now()}`, userEmail: profile?.email, title: 'Booking confirmed', message: `${draft.movieTitle} • ${draft.dateKey} • ${draft.time}`, createdAt: new Date().toISOString() }) }); } catch {}
    setDone(true);
    setTimeout(() => router.replace("/"), 1200);
  };

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Order summary */}
        <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-3 grid gap-2 text-sm text-white/80">
            <div className="flex items-center justify-between"><span>Movie</span><span className="text-white">{draft.movieTitle}</span></div>
            <div className="flex items-center justify-between"><span>Theatre</span><span className="text-white">{draft.theatreName}</span></div>
            <div className="flex items-center justify-between"><span>Date</span><span className="text-white">{draft.dateKey}</span></div>
            <div className="flex items-center justify-between"><span>Show time</span><span className="text-white">{draft.time}</span></div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-white/80">Seats</h3>
            <div className="mt-2 grid gap-2 text-sm">
              {draft.seats.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-white/5 p-2 ring-1 ring-white/10">
                  <span>{s.id} • {s.tier}</span>
                  <span>₹{s.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <div className="flex items-center justify-between text-white/80"><span>Subtotal</span><span className="text-white">₹{draft.total}</span></div>
            <div className="flex items-center justify-between text-white/80"><span>Convenience fee</span><span className="text-white">₹{fee}</span></div>
            <div className="mt-2 flex items-center justify-between text-base font-semibold"><span>Payable</span><span>₹{payable}</span></div>
          </div>
        </section>

        {/* Payment methods */}
        <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold">Payment</h2>

          <div className="mt-3 grid gap-2">
            <label className={`flex items-center gap-3 rounded-lg p-3 ring-1 ${method === "UPI" ? "bg-white/10 ring-pink-500/40" : "bg-transparent ring-white/10"}`}>
              <input type="radio" name="method" checked={method === "UPI"} onChange={() => setMethod("UPI")} />
              <SmartphoneNfc className="h-5 w-5" /> UPI
            </label>
            {method === "UPI" && (
              <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@bank" className="rounded-md bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/50" />
            )}

            <label className={`mt-2 flex items-center gap-3 rounded-lg p-3 ring-1 ${method === "CARD" ? "bg-white/10 ring-pink-500/40" : "bg-transparent ring-white/10"}`}>
              <input type="radio" name="method" checked={method === "CARD"} onChange={() => setMethod("CARD")} />
              <CreditCard className="h-5 w-5" /> Card
            </label>
            {method === "CARD" && (
              <div className="grid gap-2">
                <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="Card number" inputMode="numeric" className="rounded-md bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/50" />
                <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Name on card" className="rounded-md bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/50" />
                <div className="flex gap-2">
                  <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/YY" className="w-24 rounded-md bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/50" />
                  <input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} placeholder="CVV" className="w-24 rounded-md bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/50" />
                </div>
              </div>
            )}

            <label className={`mt-2 flex items-center gap-3 rounded-lg p-3 ring-1 ${method === "NET" ? "bg-white/10 ring-pink-500/40" : "bg-transparent ring-white/10"}`}>
              <input type="radio" name="method" checked={method === "NET"} onChange={() => setMethod("NET")} />
              <Landmark className="h-5 w-5" /> Netbanking
            </label>
          </div>

          {error && <div className="mt-3 rounded-md bg-red-500/20 p-2 text-sm text-red-300 ring-1 ring-red-500/30">{error}</div>}

          <button onClick={confirm} disabled={processing} className="mt-4 w-full rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60">
            {processing ? "Processing..." : `Pay ₹${payable}`}
          </button>
        </section>
      </main>

      {done && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70">
          <div className="rounded-2xl bg-zinc-950 p-6 ring-1 ring-white/10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <div className="mt-2 text-lg font-semibold">Payment confirmed</div>
            <div className="text-sm text-white/70">Redirecting to Home…</div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}
