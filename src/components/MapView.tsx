import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Course, DataSet, MustPlay } from '../types';
import { ACCESS_LABEL, locationLabel } from '../lib/geo';
import { bestScore } from '../lib/stats';

function esc(s: string): string {
  return String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
}

function coursePopup(c: Course): string {
  const rows = [
    `<strong>${esc(c.name)}</strong>`,
    esc(locationLabel(c)) + ` · ${ACCESS_LABEL[c.access]}`,
    c.rating != null ? `Rating ${c.rating} · Slope ${c.slope ?? '—'}` : '',
    c.stars ? `${'★'.repeat(c.stars)} <span style="opacity:.4">${'★'.repeat(5 - c.stars)}</span>` : '',
    bestScore(c) != null ? `Best: <strong>${bestScore(c)}</strong>` : '',
    c.notes ? `<em>${esc(c.notes)}</em>` : '',
  ].filter(Boolean);
  const links = [
    `<a href="https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}" target="_blank" rel="noreferrer">Maps</a>`,
    c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noreferrer">Website</a>` : '',
  ].filter(Boolean).join(' · ');
  return `<div class="popup">${rows.join('<br>')}<div class="popup-links">${links}</div></div>`;
}

function wishPopup(m: MustPlay): string {
  const rows = [
    `<strong>${esc(m.name)}</strong>`,
    esc(locationLabel(m)) + ` · ${ACCESS_LABEL[m.access]}`,
    `Status: ${m.status || 'wishlist'}`,
    m.notes ? `<em>${esc(m.notes)}</em>` : '',
  ].filter(Boolean);
  const links = [
    `<a href="https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}" target="_blank" rel="noreferrer">Maps</a>`,
    m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noreferrer">Website</a>` : '',
  ].filter(Boolean).join(' · ');
  return `<div class="popup">${rows.join('<br>')}<div class="popup-links">${links}</div></div>`;
}

interface Props {
  data: DataSet;
  onExportKML: () => void;
}

export default function MapView({ data, onExportKML }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const playedRef = useRef<L.LayerGroup>(L.layerGroup());
  const wishRef = useRef<L.LayerGroup>(L.layerGroup());
  const [showPlayed, setShowPlayed] = useState(true);
  const [showWish, setShowWish] = useState(true);

  // init once
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView([37.8, -96], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
    playedRef.current.addTo(map);
    wishRef.current.addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // draw markers when data changes
  useEffect(() => {
    const played = playedRef.current, wish = wishRef.current;
    played.clearLayers(); wish.clearLayers();
    const pts: L.LatLngExpression[] = [];

    for (const c of data.courses) {
      if (c.lat == null || c.lng == null) continue;
      pts.push([c.lat, c.lng]);
      L.circleMarker([c.lat, c.lng], {
        radius: c.stars === 5 ? 8 : 6,
        color: c.stars === 5 ? '#c8a02a' : '#1b4332',
        weight: c.stars === 5 ? 3 : 1.5,
        fillColor: '#2d6a4f',
        fillOpacity: 0.9,
      }).bindPopup(coursePopup(c)).addTo(played);
    }
    for (const m of data.mustplay) {
      if (m.lat == null || m.lng == null) continue;
      pts.push([m.lat, m.lng]);
      L.circleMarker([m.lat, m.lng], {
        radius: 6, color: '#b45309', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.9,
      }).bindPopup(wishPopup(m)).addTo(wish);
    }

    if (mapRef.current && pts.length) {
      mapRef.current.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 9 });
    }
  }, [data]);

  // toggle layers
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (showPlayed) playedRef.current.addTo(map); else map.removeLayer(playedRef.current);
  }, [showPlayed]);
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (showWish) wishRef.current.addTo(map); else map.removeLayer(wishRef.current);
  }, [showWish]);

  const playedPinned = data.courses.filter((c) => c.lat != null).length;
  const wishPinned = data.mustplay.filter((m) => m.lat != null).length;
  const wishMissing = data.mustplay.length - wishPinned;

  return (
    <div className="map-view">
      <div className="toolbar map-toolbar">
        <label className="chk inline"><input type="checkbox" checked={showPlayed} onChange={(e) => setShowPlayed(e.target.checked)} />
          <span className="dot played" /> Played ({playedPinned})</label>
        <label className="chk inline"><input type="checkbox" checked={showWish} onChange={(e) => setShowWish(e.target.checked)} />
          <span className="dot wish" /> Must Play ({wishPinned})</label>
        {wishMissing > 0 && <span className="count warn-text">⚑ {wishMissing} wishlist course{wishMissing > 1 ? 's' : ''} not yet located</span>}
        <button className="btn-ghost sm" onClick={onExportKML}>Export KML</button>
      </div>
      <div className="map-canvas" ref={elRef} />
    </div>
  );
}
