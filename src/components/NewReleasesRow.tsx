"use client";

import { useEffect, useState } from "react";
import MovieRow, { type MovieCardItem } from "./MovieRow";

export default function NewReleasesRow() {
  const [movies, setMovies] = useState<MovieCardItem[] | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams({ sort: "releaseDate", dir: "desc", limit: "10", published: "1" });
    fetch(`/api/movies?${sp.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMovies(d.movies || []))
      .catch(() => setMovies([]));
  }, []);
  return <MovieRow title="New Releases" movies={movies ?? []} />;
}
