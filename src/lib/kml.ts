import type { Course, DataSet, MustPlay } from '../types';
import { locationLabel } from './geo';
import { bestScore } from './stats';

function esc(s: string): string {
  return String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

function placemark(name: string, desc: string, lat: number, lng: number, styleUrl: string): string {
  return `    <Placemark>
      <name>${esc(name)}</name>
      <description>${esc(desc)}</description>
      <styleUrl>${styleUrl}</styleUrl>
      <Point><coordinates>${lng},${lat},0</coordinates></Point>
    </Placemark>`;
}

function courseDesc(c: Course): string {
  const bits = [locationLabel(c)];
  if (c.rating != null) bits.push(`Rating ${c.rating} / Slope ${c.slope ?? '—'}`);
  if (c.stars) bits.push(`${'★'.repeat(c.stars)} (${c.stars}/5)`);
  const best = bestScore(c);
  if (best != null) bits.push(`Best: ${best}`);
  if (c.notes) bits.push(c.notes);
  return bits.filter(Boolean).join(' • ');
}

function wishDesc(m: MustPlay): string {
  const bits = [locationLabel(m), m.status || 'wishlist'];
  if (m.notes) bits.push(m.notes);
  return bits.filter(Boolean).join(' • ');
}

export function exportKML(data: DataSet): string {
  const played = data.courses
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => placemark(c.name, courseDesc(c), c.lat!, c.lng!, '#played'))
    .join('\n');
  const wish = data.mustplay
    .filter((m) => m.lat != null && m.lng != null)
    .map((m) => placemark(m.name, wishDesc(m), m.lat!, m.lng!, '#wish'))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Matt's Golf Tracker</name>
    <Style id="played"><IconStyle><color>ff2f6a2d</color><Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon></IconStyle></Style>
    <Style id="wish"><IconStyle><color>ff1e93f4</color><Icon><href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href></Icon></IconStyle></Style>
    <Folder>
      <name>Courses Played</name>
${played}
    </Folder>
    <Folder>
      <name>Must Play</name>
${wish}
    </Folder>
  </Document>
</kml>`;
}
