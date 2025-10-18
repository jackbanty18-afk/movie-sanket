"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CategoryBar() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const current: string = params.get("category") ?? "All";

  const [items, setItems] = useState<Array<{ id: number; name: string; count: number }>>([]);
  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setItems(d.categories || []))
      .catch(() => setItems([]));
  }, []);

  const onSelect = (cat: string) => {
    const sp = new URLSearchParams(params.toString());
    if (cat === "All") {
      sp.delete("category");
    } else {
      sp.set("category", cat);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const categories = useMemo(() => [{ name: "All", id: 0, count: 0 }, ...items], [items]);

  return (
    <section id="categories" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mt-6 flex items-center justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-white">Browse by category</h2>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="flex w-max gap-2">
          {categories.map((c) => {
            const name = c.name;
            const active = name === current;
            return (
              <button
                key={name}
                onClick={() => onSelect(name)}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-pink-600 border-pink-500 text-white"
                    : "bg-white/5 border-white/15 text-white/80 hover:bg-white/10"
                }`}
                title={name}
              >
                {name}{name !== "All" && c.count ? ` (${c.count})` : ""}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
