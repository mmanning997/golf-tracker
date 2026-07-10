import type { Access, Course, DataSet, MustPlay, MustPlayStatus } from '../types';
import { nextId } from './storage';

// ---------- tiny RFC-4180-ish CSV parser ----------
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

// ---------- helpers ----------
const accessFromLabel = (raw: string): Access => {
  const s = (raw || '').toLowerCase();
  if (s.startsWith('semi')) return 'semi';
  if (s.startsWith('priv')) return 'private';
  return 'public';
};
const accessLabel = (a: Access): string => (a === 'semi' ? 'Semi-Private' : a === 'private' ? 'Private' : 'Public');
const yesNo = (b: boolean): string => (b ? 'Yes' : '');
const isYes = (s: string): boolean => /^(yes|y|true|1)$/i.test((s || '').trim());
const numOrNull = (s: string): number | null => {
  const t = (s || '').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// "NC, USA" | "Co. Kerry, Ireland" | "NC"  ->  { state, country }
function splitStateCountry(raw: string): { state: string; country: string } {
  const t = (raw || '').trim();
  if (!t) return { state: '', country: 'USA' };
  const parts = t.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const country = parts[parts.length - 1];
    const state = parts.slice(0, -1).join(', ');
    return { state, country: country || 'USA' };
  }
  if (/ireland/i.test(t) || /^co\.?\s/i.test(t)) return { state: t, country: 'Ireland' };
  return { state: t, country: 'USA' };
}

// ---------- EXPORT ----------
const PLAYED_HEADERS = [
  '#', 'Name', 'City', 'State', 'Country', 'Lat', 'Lng', 'Course Rating', 'Slope',
  'Low Score', 'Gross Score', 'My Rating', 'Date', 'Designer', 'Access',
  'GD Top 100', 'GM Top 100', 'Want to Replay', 'Notes', 'URL',
];
const MUSTPLAY_HEADERS = [
  '#', 'Name', 'City', 'State', 'Country', 'Lat', 'Lng', 'Access', 'Status',
  'Designer', 'Path', 'Tee Date', 'GD Top 100', 'GM Top 100', 'Notes', 'URL',
];

export function exportCSV(data: DataSet): string {
  const lines: string[] = [];
  lines.push(csvRow(['COURSES PLAYED']));
  lines.push(csvRow(PLAYED_HEADERS));
  data.courses.forEach((c, i) => {
    lines.push(csvRow([
      i + 1, c.name, c.city, c.state, c.country, c.lat ?? '', c.lng ?? '',
      c.rating ?? '', c.slope ?? '', c.low_score ?? '', c.gross ?? '', c.stars || '',
      c.date, c.designer, accessLabel(c.access), yesNo(c.gd100), yesNo(c.gm100),
      yesNo(c.replay), c.notes, c.url,
    ]));
  });
  lines.push('');
  lines.push(csvRow(['MUST PLAY LIST']));
  lines.push(csvRow(MUSTPLAY_HEADERS));
  data.mustplay.forEach((m, i) => {
    lines.push(csvRow([
      i + 1, m.name, m.city, m.state, m.country, m.lat ?? '', m.lng ?? '',
      accessLabel(m.access), m.status, m.designer, m.path, m.tee_date,
      yesNo(m.gd100), yesNo(m.gm100), m.notes, m.url,
    ]));
  });
  return lines.join('\n');
}

// ---------- IMPORT ----------
// Splits the two labelled sections, maps columns by header name so it accepts
// both the rich export above and the original (lat/lng-less) export.
export function importCSV(text: string): DataSet {
  const rows = parseCSV(text);
  const courses: Course[] = [];
  const mustplay: MustPlay[] = [];

  let section: 'played' | 'mustplay' | null = null;
  let headers: string[] = [];
  const idx = (name: string) => headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

  for (const row of rows) {
    const first = (row[0] || '').trim().toUpperCase();
    if (first === 'COURSES PLAYED') { section = 'played'; headers = []; continue; }
    if (first === 'MUST PLAY LIST') { section = 'mustplay'; headers = []; continue; }
    if (!section) continue;
    if (!headers.length) { headers = row; continue; }

    const get = (name: string) => { const i = idx(name); return i >= 0 ? (row[i] ?? '').trim() : ''; };
    const name = get('Name');
    if (!name) continue;

    const explicitCountry = get('Country');
    const sc = splitStateCountry(get('State'));
    const country = explicitCountry || sc.country;
    const state = explicitCountry ? get('State') : sc.state;

    if (section === 'played') {
      const lat = numOrNull(get('Lat'));
      const lng = numOrNull(get('Lng'));
      courses.push({
        id: nextId(courses),
        name, city: get('City'), state, country, lat, lng,
        rating: numOrNull(get('Course Rating')),
        slope: numOrNull(get('Slope')),
        low_score: numOrNull(get('Low Score')),
        gross: numOrNull(get('Gross Score')),
        stars: numOrNull(get('My Rating')) ?? 0,
        date: get('Date'),
        designer: get('Designer'),
        access: accessFromLabel(get('Access')),
        gd100: isYes(get('GD Top 100')),
        gm100: isYes(get('GM Top 100')),
        replay: isYes(get('Want to Replay')),
        notes: get('Notes'),
        url: get('URL'),
        geo_verified: lat != null && lng != null,
      });
    } else {
      const lat = numOrNull(get('Lat'));
      const lng = numOrNull(get('Lng'));
      const status = (get('Status') as MustPlayStatus) || '';
      const path = get('Path');
      mustplay.push({
        id: nextId(mustplay),
        name, city: get('City'), state, country, lat, lng,
        access: accessFromLabel(get('Access')),
        url: get('URL'),
        status: ['planned', 'booked', 'unicorn'].includes(status) ? status : '',
        designer: get('Designer'),
        path: (['book', 'resort', 'invite', 'pray'].includes(path) ? path : '') as MustPlay['path'],
        tee_date: get('Tee Date'),
        notes: get('Notes'),
        gd100: isYes(get('GD Top 100')),
        gm100: isYes(get('GM Top 100')),
        geo_verified: lat != null && lng != null,
      });
    }
  }
  return { courses, mustplay };
}
