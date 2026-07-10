import type { MustPlay } from '../types';
import { haversineMiles, milesFromHome } from './geo';

// Two courses belong to the same trip if they're within a comfortable
// day's-detour of each other (single-linkage clustering). 65 mi keeps the
// real clusters (Sandhills, NE dunes, Long Island) without chaining half
// of North Carolina into one "trip".
const TRIP_RADIUS_MILES = 65;

export interface Trip {
  name: string;
  states: string[];
  courses: MustPlay[];
  miles: number | null; // distance from home to the trip's nearest course
}

export function clusterTrips(list: MustPlay[]): { trips: Trip[]; unpinned: MustPlay[] } {
  const pinned = list.filter((m) => m.lat != null && m.lng != null);
  const unpinned = list.filter((m) => m.lat == null || m.lng == null);

  // union-find over pinned courses
  const parent = pinned.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  for (let i = 0; i < pinned.length; i++) {
    for (let j = i + 1; j < pinned.length; j++) {
      if (haversineMiles(pinned[i].lat!, pinned[i].lng!, pinned[j].lat!, pinned[j].lng!) <= TRIP_RADIUS_MILES) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, MustPlay[]>();
  pinned.forEach((m, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(m);
  });

  const trips: Trip[] = [...groups.values()].map((courses) => {
    // anchor = course closest to the cluster centroid → names the trip
    const cLat = courses.reduce((s, m) => s + m.lat!, 0) / courses.length;
    const cLng = courses.reduce((s, m) => s + m.lng!, 0) / courses.length;
    const anchor = courses.reduce((best, m) =>
      haversineMiles(cLat, cLng, m.lat!, m.lng!) < haversineMiles(cLat, cLng, best.lat!, best.lng!) ? m : best,
    );
    const states = [...new Set(courses.map((m) => m.state).filter(Boolean))];
    const miles = Math.min(...courses.map((m) => milesFromHome(m)!));
    const sorted = [...courses].sort((a, b) => (milesFromHome(a)! - milesFromHome(b)!) || a.name.localeCompare(b.name));
    return {
      name: courses.length > 1 ? `${anchor.city}, ${states.join(' / ')}` : `${anchor.city}, ${anchor.state}`,
      states,
      courses: sorted,
      miles,
    };
  });

  // multi-course trips first (that's the fun part), each ordered nearest-first
  trips.sort((a, b) => {
    if ((a.courses.length > 1) !== (b.courses.length > 1)) return a.courses.length > 1 ? -1 : 1;
    return (a.miles ?? Infinity) - (b.miles ?? Infinity);
  });

  return { trips, unpinned };
}
