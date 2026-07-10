import type { DataSet } from '../types';
import seedCourses from '../data/courses.json';
import seedMustplay from '../data/mustplay.json';

const KEY = 'matts-golf-tracker-v1';

export function seedData(): DataSet {
  // Deep clone so edits never mutate the imported seed modules.
  return JSON.parse(JSON.stringify({ courses: seedCourses, mustplay: seedMustplay })) as DataSet;
}

// Backfill fields added after a user's localStorage copy was written.
// Pulls designer/path/tee_date from the seed (matched by name) so schema
// upgrades don't get shadowed by stale stored data.
function normalize(data: DataSet): DataSet {
  const seed = seedData();
  const seedByName = new Map(seed.mustplay.map((m) => [m.name, m]));
  for (const m of data.mustplay) {
    const s = seedByName.get(m.name);
    if (m.designer === undefined) m.designer = s?.designer ?? '';
    if (m.path === undefined) m.path = s?.path ?? '';
    if (m.tee_date === undefined) m.tee_date = '';
    // Adopt newly-researched seed coordinates for courses the user hasn't pinned.
    if (m.lat == null && s && s.lat != null) {
      m.lat = s.lat;
      m.lng = s.lng;
      m.geo_verified = s.geo_verified;
      if (s.city && s.city !== m.city) m.city = s.city;
    }
  }
  return data;
}

export function loadData(): DataSet {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DataSet;
      if (parsed && Array.isArray(parsed.courses) && Array.isArray(parsed.mustplay)) return normalize(parsed);
    }
  } catch {
    /* fall through to seed */
  }
  return seedData();
}

export function saveData(data: DataSet): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* localStorage full or unavailable — the download button is the backstop */
  }
}

export function resetData(): DataSet {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return seedData();
}

export function nextId(items: Array<{ id: number }>): number {
  return items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
