"use client";

import { useEffect, useState } from "react";
import MovieRow, { type MovieCardItem } from "./MovieRow";

export default function TopPicksRow() {
  const [movies, setMovies] = useState<MovieCardItem[] | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams({ sort: "rating", dir: "desc", limit: "10", published: "1" });
    fetch(`/api/movies?${sp.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMovies(d.movies || []))
      .catch(() => setMovies([]));
  }, []);
  return <MovieRow title="Top Picks For You" movies={movies ?? []} />;
}
