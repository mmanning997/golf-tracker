import type { Course, DataSet, MustPlay } from '../types';
import { difficultyOf, regionOf, designerFromNotes } from './geo';

export function bestScore(c: Course): number | null {
  const vals = [c.low_score, c.gross].filter((v): v is number => v != null && v > 0);
  return vals.length ? Math.min(...vals) : null;
}

export interface Kpis {
  played: number;
  withScores: number;
  best: number | null;
  avg: number | null;
}

export function kpis(courses: Course[]): Kpis {
  const scored = courses.map(bestScore).filter((v): v is number => v != null);
  return {
    played: courses.length,
    withScores: scored.length,
    best: scored.length ? Math.min(...scored) : null,
    avg: scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null,
  };
}

export interface Bucket { label: string; count: number }

export function countBy<T>(items: T[], key: (t: T) => string): Bucket[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function byRegion(courses: Course[]): Bucket[] {
  return countBy(courses, regionOf);
}

export function byDifficulty(courses: Course[]): Bucket[] {
  const order = ['easy', 'moderate', 'hard', 'unrated'];
  return countBy(courses, (c) => difficultyOf(c.slope)).sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

export function ratingHistogram(courses: Course[]): Bucket[] {
  const out: Bucket[] = [];
  for (let s = 5; s >= 1; s--) out.push({ label: String(s), count: courses.filter((c) => c.stars === s).length });
  return out;
}

export function fiveStars(courses: Course[]): Course[] {
  return courses.filter((c) => c.stars === 5).sort((a, b) => a.name.localeCompare(b.name));
}

export function replayList(courses: Course[]): Course[] {
  return courses.filter((c) => c.replay).sort((a, b) => a.name.localeCompare(b.name));
}

export function designerName(c: Course): string | null {
  if (c.designer && c.designer.trim()) return c.designer.trim();
  return designerFromNotes(c.notes);
}

// Splits multi-architect credits ("Coore & Crenshaw", "Nicklaus, Player, Palmer",
// "Doak / Coore & Crenshaw / Hanse").
export function splitDesigners(raw: string): string[] {
  return raw.split(/\s*(?:&|,|\/| and )\s*/i).map((s) => s.trim()).filter(Boolean);
}

// Normalize an architect name to a comparable key: match on surname so
// "Coore" ≈ "Bill Coore"; keep suffixes ("Robert Trent Jones II" ≠ "Robert Trent Jones").
function designerKey(raw: string): string {
  let n = raw.toLowerCase().replace(/\./g, '').trim();
  if (n === 'rtj ii') n = 'robert trent jones ii';
  const toks = n.split(/\s+/);
  const last = toks[toks.length - 1];
  if (toks.length > 1 && ['jr', 'sr', 'ii', 'iii'].includes(last)) return toks.slice(-2).join(' ');
  return last;
}

// Designer leaderboard, counting each distinct designer credited on a course.
export function designerLeaderboard(courses: Course[]): Bucket[] {
  const map = new Map<string, number>();
  for (const c of courses) {
    const raw = designerName(c);
    if (!raw) continue;
    for (const n of splitDesigners(raw)) map.set(n, (map.get(n) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter((b) => b.count >= 1)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// How many played courses share an architect with this designer credit.
export function playedByDesigner(courses: Course[], designerStr: string): number {
  if (!designerStr.trim()) return 0;
  const want = new Set(splitDesigners(designerStr).map(designerKey));
  let count = 0;
  for (const c of courses) {
    const dn = designerName(c);
    if (!dn) continue;
    if (splitDesigners(dn).some((n) => want.has(designerKey(n)))) count++;
  }
  return count;
}

export const MUSTPLAY_STATUS_LABEL: Record<string, string> = {
  '': 'Wishlist',
  planned: 'Planned',
  booked: 'Booked',
  unicorn: 'Unicorn',
};

export function mustplayBreakdown(mustplay: MustPlay[]): Bucket[] {
  const order = ['booked', 'planned', '', 'unicorn'];
  return countBy(mustplay, (m) => m.status).sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

// Handicap differential: (score − course rating) × 113 ÷ slope.
// The number an index is actually built from — lower is better, and it
// rewards good scores on hard tracks over easy-course birdiefests.
export interface Differential {
  course: Course;
  score: number;
  diff: number;
}

export function bestDifferentials(courses: Course[]): Differential[] {
  const out: Differential[] = [];
  for (const c of courses) {
    const s = bestScore(c);
    if (s == null || c.rating == null || c.slope == null) continue;
    out.push({ course: c, score: s, diff: Math.round(((s - c.rating) * 113 / c.slope) * 10) / 10 });
  }
  return out.sort((a, b) => a.diff - b.diff);
}

export function top100(data: DataSet) {
  return {
    gdPlayed: data.courses.filter((c) => c.gd100),
    gmPlayed: data.courses.filter((c) => c.gm100),
    gdWish: data.mustplay.filter((m) => m.gd100),
    gmWish: data.mustplay.filter((m) => m.gm100),
  };
}
