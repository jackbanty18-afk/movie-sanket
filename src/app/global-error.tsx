"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Global error boundary replaces the root layout when an error happens.
  return (
    <html>
      <body className="bg-black text-white min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl bg-zinc-950 p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          {error?.message && (
            <p className="mt-2 text-sm text-white/70 break-words">{error.message}</p>
          )}
          {error?.digest && (
            <p className="mt-1 text-xs text-white/50">Digest: {error.digest}</p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => reset()}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-pink-500/40 hover:bg-pink-500"
            >
              Try again
            </button>
            <Link href="/" className="rounded-md bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20 hover:bg-white/20">Go home</Link>
          </div>
        </div>
      </body>
    </html>
  );
}
