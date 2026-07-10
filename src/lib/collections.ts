import type { DataSet } from '../types';

// Themed course sets to complete, matched by lowercase substring against
// both the played and must-play lists. Items can name courses that aren't
// tracked yet — that's the point of a collection.

interface ItemDef {
  label: string;
  match: string; // lowercase substring tested against course names
}

interface CollectionDef {
  id: string;
  name: string;
  desc: string;
  items: ItemDef[];
}

const DEFS: CollectionDef[] = [
  {
    id: 'strantz',
    name: 'The Strantz Seven',
    desc: 'Every 18 Mike Strantz built — all seven, nothing else like them.',
    items: [
      { label: 'Tobacco Road', match: 'tobacco road' },
      { label: 'Tot Hill Farm', match: 'tot hill' },
      { label: 'Bulls Bay', match: 'bulls bay' },
      { label: 'Caledonia Golf & Fish Club', match: 'caledonia' },
      { label: 'True Blue', match: 'true blue' },
      { label: 'Royal New Kent', match: 'royal new kent' },
      { label: 'Stonehouse', match: 'stonehouse' },
    ],
  },
  {
    id: 'emerald',
    name: 'The Emerald Ten',
    desc: "Ireland's great links — the full pilgrimage.",
    items: [
      { label: 'Ballybunion (Old)', match: 'ballybunion' },
      { label: 'Lahinch (Old)', match: 'lahinch' },
      { label: 'Waterville', match: 'waterville' },
      { label: 'Tralee', match: 'tralee' },
      { label: 'Old Head', match: 'old head' },
      { label: 'Portmarnock', match: 'portmarnock' },
      { label: 'Doonbeg', match: 'doonbeg' },
      { label: 'The European Club', match: 'european club' },
      { label: 'Royal County Down', match: 'royal county down' },
      { label: 'Royal Portrush', match: 'royal portrush' },
    ],
  },
  {
    id: 'ross',
    name: 'The Ross Run',
    desc: 'Donald Ross, from the Sandhills to the Northeast.',
    items: [
      { label: 'Pinehurst No. 2', match: 'pinehurst resort no.2' },
      { label: 'Mid Pines', match: 'mid pines' },
      { label: 'Pine Needles', match: 'pine needles' },
      { label: 'Southern Pines GC', match: 'southern pines' },
      { label: 'Knickerbocker CC', match: 'knickerbocker' },
    ],
  },
  {
    id: 'meccas',
    name: 'Resort Meccas',
    desc: 'The great American buddies-trip destinations.',
    items: [
      { label: 'Bandon Dunes', match: 'bandon dunes' },
      { label: 'Sand Valley', match: 'sand valley' },
      { label: 'Streamsong', match: 'streamsong' },
      { label: 'Cabot Citrus Farms', match: 'cabot citrus' },
      { label: 'Whistling Straits', match: 'whistling straits' },
      { label: 'Pinehurst', match: 'pinehurst' },
    ],
  },
  {
    id: 'dye',
    name: 'The Dye Gauntlet',
    desc: 'Pete Dye wants to hurt you. Let him.',
    items: [
      { label: 'Paiute – Wolf', match: 'paiute' },
      { label: 'Whistling Straits', match: 'whistling straits' },
      { label: 'Ocean Course, Kiawah', match: 'ocean course' },
      { label: 'The Honors Course', match: 'honors course' },
      { label: 'Crooked Stick', match: 'crooked stick' },
    ],
  },
  {
    id: 'fazio',
    name: 'Fazio Files',
    desc: "Tom Fazio's greatest hits — you keep ending up on them.",
    items: [
      { label: 'Sage Valley', match: 'sage valley' },
      { label: 'Sea Island – Seaside', match: 'seaside' },
      { label: 'Waterville (redesign)', match: 'waterville' },
      { label: 'Wade Hampton', match: 'wade hampton' },
      { label: 'Congaree', match: 'congaree' },
      { label: 'Diamond Creek', match: 'diamond creek' },
      { label: 'Alotian Club', match: 'alotian' },
    ],
  },
];

export type ItemStatus = 'played' | 'wishlist' | 'missing';

export interface CollectionItem {
  label: string;
  status: ItemStatus;
}

export interface Collection {
  id: string;
  name: string;
  desc: string;
  items: CollectionItem[];
  played: number;
  total: number;
  complete: boolean;
}

export function evaluateCollections(data: DataSet): Collection[] {
  const playedNames = data.courses.map((c) => c.name.toLowerCase());
  const wishNames = data.mustplay.map((m) => m.name.toLowerCase());

  const cols = DEFS.map((def) => {
    const items: CollectionItem[] = def.items.map((it) => {
      const status: ItemStatus = playedNames.some((n) => n.includes(it.match))
        ? 'played'
        : wishNames.some((n) => n.includes(it.match))
          ? 'wishlist'
          : 'missing';
      return { label: it.label, status };
    });
    const played = items.filter((i) => i.status === 'played').length;
    return { id: def.id, name: def.name, desc: def.desc, items, played, total: items.length, complete: played === items.length };
  });

  // most-progressed first — the ones worth chasing
  return cols.sort((a, b) => b.played / b.total - a.played / a.total || b.played - a.played);
}
