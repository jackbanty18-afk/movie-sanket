"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return setError("Please enter email and password.");
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await r.json();
      if (!r.ok) return setError(data?.error || 'Login failed');
      const { saveProfile } = await import("@/lib/user");
      saveProfile({ id: data.user.id, fullName: data.user.fullName, email: data.user.email, createdAt: new Date().toISOString() });
      const roles: string[] = Array.isArray(data.user.roles) ? data.user.roles : [];
      router.push(roles.includes('admin') ? '/admin' : '/');
    } catch (err) {
      setError("Login failed. Try again.");
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-black p-6 ring-1 ring-white/10 shadow-2xl">
        <h1 className="text-xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-white/70">Login to continue</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg bg-white/10 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500"
              placeholder="you@example.com"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Password</span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg bg-white/10 px-3 py-2 pr-10 outline-none ring-1 ring-white/10 placeholder:text-white/50 focus:ring-2 focus:ring-pink-500"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:bg-white/10">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && <div className="rounded-lg bg-red-500/20 p-2 text-sm text-red-300 ring-1 ring-red-500/30">{error}</div>}

          <button type="submit" className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">
            <LogIn className="h-4 w-4" /> Login
          </button>
        </form>

        <p className="mt-4 text-sm text-white/70">
          New here? <Link href="/auth/signup" className="text-pink-400 hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}