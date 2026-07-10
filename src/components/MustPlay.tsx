import { useMemo, useState } from 'react';
import type { Access, Course, MustPlay, MustPlayStatus, PathToPlay } from '../types';
import { ACCESS_LABEL, googleMapsLink, locationLabel, milesFromHome, travelLabel } from '../lib/geo';
import { playedByDesigner } from '../lib/stats';
import { clusterTrips } from '../lib/trips';
import { nextId } from '../lib/storage';

interface Props {
  mustplay: MustPlay[];
  courses: Course[];
  onSave: (m: MustPlay) => void;
  onDelete: (id: number) => void;
  onPlayed: (m: MustPlay) => void;
}

const STATUS: { value: MustPlayStatus; icon: string; label: string }[] = [
  { value: '', icon: '🎯', label: 'Wishlist' },
  { value: 'planned', icon: '🗓', label: 'Planned' },
  { value: 'booked', icon: '✅', label: 'Booked' },
  { value: 'unicorn', icon: '🦄', label: 'Unicorn' },
];
const statusMeta = (s: MustPlayStatus) => STATUS.find((x) => x.value === s) ?? STATUS[0];
const ORDER: Record<MustPlayStatus, number> = { booked: 0, planned: 1, '': 2, unicorn: 3 };

const PATH: Record<Exclude<PathToPlay, ''>, { icon: string; label: string; cls: string }> = {
  book: { icon: '🟢', label: 'Book online', cls: 'path-book' },
  resort: { icon: '🏨', label: 'Resort stay', cls: 'path-resort' },
  invite: { icon: '🤝', label: 'Need a member', cls: 'path-invite' },
  pray: { icon: '🙏', label: 'Pray', cls: 'path-pray' },
};

const daysUntil = (iso: string): number | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
};

const blank = (list: MustPlay[]): MustPlay => ({
  id: nextId(list), name: '', city: '', state: '', country: 'USA', lat: null, lng: null,
  access: 'public', url: '', status: '', notes: '', gd100: false, gm100: false, geo_verified: false,
  designer: '', path: '', tee_date: '',
});

type ViewMode = 'list' | 'trips';
type SortMode = 'status' | 'closest' | 'name';

const parseNum = (t: string): number | null => {
  const s = t.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export default function MustPlayView({ mustplay, courses, onSave, onDelete, onPlayed }: Props) {
  const [draft, setDraft] = useState<MustPlay | null>(null);
  // lat/lng are edited as free text so partial input like "-" or "35." isn't
  // eaten by number parsing mid-keystroke; parsed once on save.
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [mode, setMode] = useState<ViewMode>('list');
  const [sortMode, setSortMode] = useState<SortMode>('status');

  const openDraft = (m: MustPlay) => {
    setDraft(m);
    setLatText(m.lat == null ? '' : String(m.lat));
    setLngText(m.lng == null ? '' : String(m.lng));
  };

  const sorted = useMemo(() => {
    const list = [...mustplay];
    if (sortMode === 'closest') {
      list.sort((a, b) => (milesFromHome(a) ?? Infinity) - (milesFromHome(b) ?? Infinity) || a.name.localeCompare(b.name));
    } else if (sortMode === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));
    }
    return list;
  }, [mustplay, sortMode]);

  const { trips, unpinned } = useMemo(() => clusterTrips(mustplay), [mustplay]);

  const set = <K extends keyof MustPlay>(k: K, v: MustPlay[K]) => setDraft((p) => (p ? { ...p, [k]: v } : p));
  const save = () => {
    if (!draft || !draft.name.trim()) return;
    const lat = parseNum(latText);
    const lng = parseNum(lngText);
    onSave({ ...draft, lat, lng, geo_verified: lat != null && lng != null });
    setDraft(null);
  };

  const row = (m: MustPlay) => {
    const meta = statusMeta(m.status);
    const miles = milesFromHome(m);
    const played = playedByDesigner(courses, m.designer);
    const path = m.path ? PATH[m.path] : null;
    const days = m.status === 'booked' ? daysUntil(m.tee_date) : null;
    return (
      <li key={m.id} className="wish-row">
        <span className="wish-status" title={meta.label}>{meta.icon}</span>
        <div className="wish-main">
          <div className="cname">
            {m.name}
            {m.gd100 && <span className="tag gd">GD</span>}
            {m.gm100 && <span className="tag gm">GM</span>}
            {path && <span className={`tag path ${path.cls}`} title="Path to play">{path.icon} {path.label}</span>}
            {days != null && days >= 0 && (
              <span className="tag countdown" title={`Tee time ${m.tee_date}`}>
                ⛳ {days === 0 ? 'today!' : days === 1 ? 'tomorrow' : `in ${days} days`}
              </span>
            )}
            {m.lat == null && <span className="tag warn" title="No coordinates yet">⚑</span>}
          </div>
          <div className="cnotes">
            {locationLabel(m)} · {ACCESS_LABEL[m.access]}
            {miles != null && <> · <span className="dist">{travelLabel(miles)}</span></>}
            {m.notes ? ` · ${m.notes}` : ''}
          </div>
          {m.designer && (
            <div className="cnotes designer-line">
              {m.designer}
              {played > 0 && <span className="tag kin" title="Courses you've played by these architects">you've played {played}</span>}
            </div>
          )}
        </div>
        <div className="actions">
          <a className="ibtn" href={googleMapsLink(m)} target="_blank" rel="noreferrer" title="Google Maps">📍</a>
          {m.url && <a className="ibtn" href={m.url} target="_blank" rel="noreferrer" title="Website">🔗</a>}
          <button className="ibtn play" title="Played it!" onClick={() => onPlayed(m)}>⛳</button>
          <button className="ibtn" title="Edit" onClick={() => openDraft({ ...m })}>✎</button>
          <button className="ibtn danger" title="Remove" onClick={() => { if (confirm(`Remove "${m.name}" from the list?`)) onDelete(m.id); }}>✕</button>
        </div>
      </li>
    );
  };

  return (
    <div>
      <div className="toolbar">
        <div className="seg-toggle" role="group" aria-label="View mode">
          <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>List</button>
          <button className={mode === 'trips' ? 'on' : ''} onClick={() => setMode('trips')}>Trips</button>
        </div>
        {mode === 'list' && (
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort">
            <option value="status">By status</option>
            <option value="closest">Closest first</option>
            <option value="name">A–Z</option>
          </select>
        )}
        <span className="count">{mustplay.length} on the list</span>
        <button className="btn-primary sm" onClick={() => openDraft(blank(mustplay))} disabled={!!draft}>+ Add to list</button>
      </div>

      {draft && (
        <div className="inline-form">
          <div className="grid-form">
            <div className="field"><label>Name</label>
              <input autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Course name" /></div>
            <div className="field"><label>City</label>
              <input value={draft.city} onChange={(e) => set('city', e.target.value)} /></div>
            <div className="field"><label>State</label>
              <input value={draft.state} onChange={(e) => set('state', e.target.value)} /></div>
            <div className="field"><label>Status</label>
              <select value={draft.status} onChange={(e) => set('status', e.target.value as MustPlayStatus)}>
                {STATUS.map((s) => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
              </select></div>
            {draft.status === 'booked' && (
              <div className="field"><label>Tee time date</label>
                <input type="date" value={draft.tee_date} onChange={(e) => set('tee_date', e.target.value)} /></div>
            )}
            <div className="field"><label>Designer</label>
              <input value={draft.designer} onChange={(e) => set('designer', e.target.value)} placeholder="e.g. Coore & Crenshaw" /></div>
            <div className="field"><label>Path to play</label>
              <select value={draft.path} onChange={(e) => set('path', e.target.value as PathToPlay)}>
                <option value="">—</option>
                <option value="book">🟢 Book online</option>
                <option value="resort">🏨 Resort stay</option>
                <option value="invite">🤝 Need a member</option>
                <option value="pray">🙏 Pray</option>
              </select></div>
            <div className="field"><label>Access</label>
              <select value={draft.access} onChange={(e) => set('access', e.target.value as Access)}>
                <option value="public">Public</option><option value="semi">Semi-Private</option><option value="private">Private</option>
              </select></div>
            <div className="field"><label>Latitude</label>
              <input value={latText} inputMode="decimal" placeholder="35.4693" onChange={(e) => setLatText(e.target.value)} /></div>
            <div className="field"><label>Longitude</label>
              <input value={lngText} inputMode="decimal" placeholder="-80.9160" onChange={(e) => setLngText(e.target.value)} /></div>
            <div className="field wide"><label>Website</label>
              <input value={draft.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></div>
            <div className="field wide"><label>Notes</label>
              <input value={draft.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            <div className="field checks">
              <label className="chk"><input type="checkbox" checked={draft.gd100} onChange={(e) => set('gd100', e.target.checked)} /> GD 100</label>
              <label className="chk"><input type="checkbox" checked={draft.gm100} onChange={(e) => set('gm100', e.target.checked)} /> GM 100</label>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-primary sm" onClick={save}>Save</button>
            <button className="btn-ghost sm" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      {mode === 'list' && <ul className="wishlist">{sorted.map(row)}</ul>}

      {mode === 'trips' && (
        <div className="trips">
          {trips.map((t) => (
            <section className="trip-card" key={t.name + t.courses[0].id}>
              <header className="trip-head">
                <h3>📍 {t.name}</h3>
                <span className="trip-meta">
                  {t.courses.length} course{t.courses.length > 1 ? 's' : ''}
                  {t.miles != null && <> · {travelLabel(t.miles)}</>}
                </span>
              </header>
              <ul className="wishlist">{t.courses.map(row)}</ul>
            </section>
          ))}
          {unpinned.length > 0 && (
            <section className="trip-card">
              <header className="trip-head">
                <h3>⚑ Location TBD</h3>
                <span className="trip-meta">{unpinned.length} course{unpinned.length > 1 ? 's' : ''} — add coordinates to place them in a trip</span>
              </header>
              <ul className="wishlist">{unpinned.map(row)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
