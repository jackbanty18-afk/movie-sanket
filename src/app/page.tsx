import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryBar from "@/components/CategoryBar";
import MoviesGrid from "@/components/MoviesGrid";
import TopPicksRow from "@/components/TopPicksRow";
import NewReleasesRow from "@/components/NewReleasesRow";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <HeroCarousel />
      <div className="mt-2 sm:mt-4" />
      <Suspense>
        <CategoryBar />
      </Suspense>
      <Suspense>
        <MoviesGrid />
      </Suspense>
      <TopPicksRow />
      <NewReleasesRow />
      <div className="h-12" />
    </div>
  );
}
