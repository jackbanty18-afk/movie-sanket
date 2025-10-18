"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    dob: "",
    country: "",
    agree: false,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.fullName || !form.email || !form.password || !form.confirm) {
      return setError("Please fill all required fields.");
    }
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (!form.agree) return setError("You must accept the Terms.");

    try {
      const r = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: form.fullName, email: form.email, password: form.password, phone: form.phone, dob: form.dob, country: form.country }) });
      const data = await r.json();
      if (!r.ok) return setError(data?.error || 'Signup failed');
      const { saveProfile } = await import("@/lib/user");
      saveProfile({ id: data.user.id, fullName: data.user.fullName, email: data.user.email, phone: form.phone, dob: form.dob, country: form.country, createdAt: new Date().toISOString() });
      router.push("/");
    } catch (err) {
      setError("Signup failed. Try again.");
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-black p-6 ring-1 ring-white/10 shadow-2xl">
        <h1 className="text-xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-white/70">Sign up to get started</p>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="col-span-2 grid gap-1 text-sm">
            <span className="text-white/80">Full name</span>
            <input name="fullName" value={form.fullName} onChange={onChange} required placeholder="Your name" className="rounded-lg bg-white/10 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500" />
          </label>

          <label className="col-span-2 sm:col-span-1 grid gap-1 text-sm">
            <span className="text-white/80">Email</span>
            <input type="email" name="email" value={form.email} onChange={onChange} required placeholder="you@example.com" className="rounded-lg bg-white/10 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500" />
          </label>

          <label className="col-span-2 sm:col-span-1 grid gap-1 text-sm">
            <span className="text-white/80">Phone</span>
            <input name="phone" value={form.phone} onChange={onChange} placeholder="+91 99999 99999" className="rounded-lg bg-white/10 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500" />
          </label>

          <label className="col-span-2 sm:col-span-1 grid gap-1 text-sm">
            <span className="text-white/80">Password</span>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} name="password" value={form.password} onChange={onChange} required placeholder="••••••••" className="w-full rounded-lg bg-white/10 px-3 py-2 pr-10 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500" />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:bg-white/10">{showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </label>

          <label className="col-span-2 sm:col-span-1 grid gap-1 text-sm">
            <span className="text-white/80">Confirm password</span>
            <div className="relative">
              <input type={showConf ? "text" : "password"} name="confirm" value={form.confirm} onChange={onChange} required placeholder="••••••••" className="w-full rounded-lg bg-white/10 px-3 py-2 pr-10 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500" />
              <button type="button" onClick={() => setShowConf((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:bg-white/10">{showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </label>

          <label className="col-span-2 sm:col-span-1 grid gap-1 text-sm">
            <span className="text-white/80">Date of birth</span>
            <input type="date" name="dob" value={form.dob} onChange={onChange} className="rounded-lg bg-white/10 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500" />
          </label>

          <label className="col-span-2 sm:col-span-1 grid gap-1 text-sm">
            <span className="text-white/80">Country</span>
            <input name="country" value={form.country} onChange={onChange} placeholder="India" className="rounded-lg bg-white/10 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500" />
          </label>

          <label className="col-span-2 mt-1 flex items-start gap-2 text-sm">
            <input type="checkbox" name="agree" checked={form.agree} onChange={onChange} className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10" />
            <span className="text-white/80">I agree to the Terms and Privacy Policy.</span>
          </label>

          {error && <div className="col-span-2 rounded-lg bg-red-500/20 p-2 text-sm text-red-300 ring-1 ring-red-500/30">{error}</div>}

          <div className="col-span-2">
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">
              <UserPlus className="h-4 w-4" /> Create account
            </button>
          </div>
        </form>

        <p className="mt-4 text-sm text-white/70">
          Already have an account? <Link href="/auth/login" className="text-pink-400 hover:underline">Login</Link>
        </p>
      </div>
    </main>
  );
}