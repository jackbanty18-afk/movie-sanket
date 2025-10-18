export type Movie = {
  id: string;
  title: string;
  year: number;
  poster: string;
  backdrop: string;
  categories: string[];
  rating: number; // 0-10
  durationMins: number;
  releaseDate: string; // ISO date
  languages: string[];
  formats: string[]; // e.g., ["2D", "IMAX 2D"]
};

export const MOVIES: Movie[] = [
  {
    id: "m1",
    title: "Dark Secrets",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1482192505345-5655af888cc4?q=80&w=1920&auto=format&fit=crop",
    categories: ["Thriller"],
    rating: 8.5,
    durationMins: 128,
    releaseDate: "2024-06-01",
    languages: ["English"],
    formats: ["2D", "IMAX 2D"],
  },
  {
    id: "m2",
    title: "Mystic Quest",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop",
    categories: ["Fantasy", "Adventure"],
    rating: 9.1,
    durationMins: 142,
    releaseDate: "2024-07-10",
    languages: ["English"],
    formats: ["2D", "3D"],
  },
  {
    id: "m3",
    title: "Love's Journey",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop",
    categories: ["Romance"],
    rating: 7.8,
    durationMins: 124,
    releaseDate: "2024-03-22",
    languages: ["English"],
    formats: ["2D"],
  },
  {
    id: "m4",
    title: "Cyber Wars",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1526312426976-593c2b999992?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?q=80&w=1920&auto=format&fit=crop",
    categories: ["Sci-Fi"],
    rating: 8.9,
    durationMins: 136,
    releaseDate: "2024-11-02",
    languages: ["English"],
    formats: ["2D", "4DX", "IMAX 2D"],
  },
  {
    id: "m5",
    title: "The Haunting",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop",
    categories: ["Horror"],
    rating: 8.2,
    durationMins: 118,
    releaseDate: "2024-10-05",
    languages: ["English"],
    formats: ["2D"],
  },
  {
    id: "m6",
    title: "Comedy Central",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1920&auto=format&fit=crop",
    categories: ["Comedy"],
    rating: 7.5,
    durationMins: 110,
    releaseDate: "2024-05-15",
    languages: ["English"],
    formats: ["2D"],
  },
  // Top Picks examples
  {
    id: "tp1",
    title: "Echoes of Time",
    year: 2023,
    poster:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1920&auto=format&fit=crop",
    categories: ["Adventure", "Drama"],
    rating: 8.7,
    durationMins: 129,
    releaseDate: "2023-09-07",
    languages: ["English"],
    formats: ["2D"],
  },
  {
    id: "tp2",
    title: "Neon Samurai",
    year: 2022,
    poster:
      "https://images.unsplash.com/photo-1491554150235-360cadcda1a5?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1491555103944-7c647fd857e6?q=80&w=1920&auto=format&fit=crop",
    categories: ["Action", "Sci-Fi"],
    rating: 8.9,
    durationMins: 131,
    releaseDate: "2022-08-12",
    languages: ["English", "Japanese"],
    formats: ["2D", "IMAX 2D"],
  },
  {
    id: "tp3",
    title: "Ocean Whisper",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=1920&auto=format&fit=crop",
    categories: ["Romance"],
    rating: 7.9,
    durationMins: 115,
    releaseDate: "2024-04-19",
    languages: ["English"],
    formats: ["2D"],
  },
  {
    id: "tp4",
    title: "City of Shadows",
    year: 2024,
    poster:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1500043357865-c6b8827edf54?q=80&w=1920&auto=format&fit=crop",
    categories: ["Thriller"],
    rating: 8.3,
    durationMins: 123,
    releaseDate: "2024-12-01",
    languages: ["English"],
    formats: ["2D"],
  },
  // New Releases examples
  {
    id: "nr1",
    title: "Starlight",
    year: 2025,
    poster:
      "https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1447430617419-95715602278e?q=80&w=1920&auto=format&fit=crop",
    categories: ["Sci-Fi"],
    rating: 8.1,
    durationMins: 126,
    releaseDate: "2025-01-20",
    languages: ["English"],
    formats: ["2D", "4DX"],
  },
  {
    id: "nr2",
    title: "Laugh Riot",
    year: 2025,
    poster:
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1519750783826-e2420f4d687f?q=80&w=1920&auto=format&fit=crop",
    categories: ["Comedy"],
    rating: 7.4,
    durationMins: 109,
    releaseDate: "2025-02-05",
    languages: ["English"],
    formats: ["2D"],
  },
  {
    id: "nr3",
    title: "Midnight Caller",
    year: 2025,
    poster:
      "https://images.unsplash.com/photo-1569098644580-47de93ba43c3?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1920&auto=format&fit=crop",
    categories: ["Horror", "Thriller"],
    rating: 7.8,
    durationMins: 121,
    releaseDate: "2025-03-15",
    languages: ["English"],
    formats: ["2D"],
  },
  {
    id: "nr4",
    title: "Hidden Truths",
    year: 2025,
    poster:
      "https://images.unsplash.com/photo-1517602302552-471fe67acf66?q=80&w=900&auto=format&fit=crop",
    backdrop:
      "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?q=80&w=1920&auto=format&fit=crop",
    categories: ["Drama"],
    rating: 8.0,
    durationMins: 119,
    releaseDate: "2025-04-10",
    languages: ["English"],
    formats: ["2D"],
  },
];

export function getMovieById(id: string) {
  return MOVIES.find((m) => m.id === id);
}