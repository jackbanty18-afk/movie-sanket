"use client";

import { getProfile, clearProfile } from "@/lib/user";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

function fmt(dateISO?: string) {
  if (!dateISO) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(dateISO));
  } catch {
    return dateISO;
  }
}

export default function AccountPage() {
  const router = useRouter();
  const p = getProfile();
  const name = p?.fullName ?? "Guest User";
  const email = p?.email ?? "guest@example.com";

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col items-center text-center">
        <UserCircle className="h-20 w-20 text-white/80" />
        <h1 className="mt-3 text-2xl font-extrabold">{name}</h1>
        <p className="mt-1 text-white/70 text-sm">{email}</p>
        <button onClick={() => router.push('/')} className="mt-3 rounded-md bg-white/10 px-3 py-1.5 text-sm ring-1 ring-white/20 hover:bg-white/20">Back to Home</button>
      </div>

      <section className="mt-6 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
        <h2 className="text-lg font-semibold">Personal info</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
            <div className="text-white/60">Full name</div>
            <div className="font-medium">{name}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
            <div className="text-white/60">Email</div>
            <div className="font-medium">{email}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
            <div className="text-white/60">Phone</div>
            <div className="font-medium">{p?.phone ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
            <div className="text-white/60">Date of birth</div>
            <div className="font-medium">{p?.dob ? fmt(p.dob) : "—"}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
            <div className="text-white/60">Country</div>
            <div className="font-medium">{p?.country ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
            <div className="text-white/60">Account created</div>
            <div className="font-medium">{fmt(p?.createdAt)}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => router.push("/auth/signup")} className="rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20 hover:bg-white/20">Update info</button>
          <button onClick={() => { clearProfile(); router.push("/auth/login"); }} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">Logout</button>
        </div>
      </section>
    </main>
  );
}
