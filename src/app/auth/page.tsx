export default function AuthPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Login / Sign up</h1>
      <p className="mt-2 text-white/70">This is a placeholder form you can replace later.</p>
      <div className="mt-6 grid max-w-md gap-3">
        <input className="rounded-lg bg-white/10 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/50" placeholder="Email" />
        <input className="rounded-lg bg-white/10 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/50" placeholder="Password" type="password" />
        <div className="flex gap-2">
          <button className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">Login</button>
          <button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/20">Sign up</button>
        </div>
      </div>
    </main>
  );
}