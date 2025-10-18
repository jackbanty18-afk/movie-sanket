"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      {error?.message && <p className="mt-2 text-sm text-white/70">{error.message}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={() => reset()} className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500">
          Try again
        </button>
        <Link href="/" className="rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20 hover:bg-white/20">Go home</Link>
      </div>
    </div>
  );
}
