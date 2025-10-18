export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  dob?: string; // YYYY-MM-DD
  country?: string;
  createdAt: string; // ISO
};

const KEY = "mdtalkies_profile_v1";

export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
