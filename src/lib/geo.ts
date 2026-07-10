import type { Course, MustPlay } from '../types';

// Home base: The Peninsula Club, Cornelius NC.
export const HOME: [number, number] = [35.4693, -80.916];

// Great-circle distance in miles.
export function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function milesFromHome(m: { lat: number | null; lng: number | null }): number | null {
  if (m.lat == null || m.lng == null) return null;
  return haversineMiles(HOME[0], HOME[1], m.lat, m.lng);
}

// "112 mi · ~2h drive" under ~450 mi, otherwise "✈️ 1,912 mi".
export function travelLabel(miles: number): string {
  const mi = Math.round(miles);
  if (miles > 450) return `✈️ ${mi.toLocaleString()} mi`;
  const hours = (miles / 62) * 1.15; // rough highway pace + slack
  if (hours < 1) return `${mi} mi · ~${Math.max(5, Math.round(hours * 60 / 5) * 5)} min drive`;
  const h = Math.floor(hours);
  const min = Math.round((hours - h) * 60 / 15) * 15;
  return `${mi} mi · ~${min === 60 ? h + 1 : h}h${min > 0 && min < 60 ? ` ${min}m` : ''} drive`;
}

export function locationLabel(c: { city: string; state: string; country: string }): string {
  const parts = [c.city, c.state].filter(Boolean);
  const base = parts.join(', ');
  if (c.country && c.country !== 'USA') return base ? `${base}, ${c.country}` : c.country;
  return base;
}

export function googleMapsLink(c: { name: string; lat: number | null; lng: number | null; city: string; state: string; country: string }): string {
  if (c.lat != null && c.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
  }
  const q = encodeURIComponent(`${c.name} ${locationLabel(c)}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'unrated';

export function difficultyOf(slope: number | null): Difficulty {
  if (slope == null) return 'unrated';
  if (slope <= 134) return 'easy';
  if (slope <= 144) return 'moderate';
  return 'hard';
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy (≤134)',
  moderate: 'Moderate (135–144)',
  hard: 'Hard (≥145)',
  unrated: 'Unrated',
};

// Group US courses by state, everything else by country.
export function regionOf(c: { state: string; country: string }): string {
  if (c.country && c.country !== 'USA') return c.country;
  return c.state || 'Unknown';
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ACCESS_LABEL: Record<string, string> = {
  private: 'Private',
  semi: 'Semi-Private',
  public: 'Public',
};

// Pull a designer name out of a notes string when the designer field is empty.
// Matches "Xxx design", "Xxx-designed", "by Xxx".
export function designerFromNotes(notes: string): string | null {
  if (!notes) return null;
  let m = notes.match(/([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2})\s+(?:design|designed|-designed)/);
  if (m) return m[1].trim();
  m = notes.match(/\bby\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2})/);
  if (m) return m[1].trim();
  return null;
}

export function anyUnverified(items: Array<Course | MustPlay>): number {
  return items.filter((i) => (i.lat != null || i.lng != null) && !i.geo_verified).length;
}
