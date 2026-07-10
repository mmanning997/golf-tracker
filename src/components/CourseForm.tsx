import { useEffect, useState } from 'react';
import type { Access, Course } from '../types';

type Draft = Omit<Course, 'id' | 'geo_verified'> & { id?: number };

interface Props {
  initial: Course | null;
  prefill?: Partial<Course>;
  title: string;
  onSave: (c: Course) => void;
  onClose: () => void;
}

const EMPTY: Draft = {
  name: '', city: '', state: '', country: 'USA', lat: null, lng: null,
  rating: null, slope: null, gross: null, low_score: null, stars: 0,
  date: '', designer: '', access: 'public', gd100: false, gm100: false,
  replay: false, notes: '', url: '',
};

type NumKey = 'lat' | 'lng' | 'rating' | 'slope' | 'gross' | 'low_score';

const parseNum = (t: string): number | null => {
  const s = t.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export default function CourseForm({ initial, prefill, title, onSave, onClose }: Props) {
  const [d, setD] = useState<Draft>(() => ({ ...EMPTY, ...(initial ?? {}), ...(prefill ?? {}) }));
  // Numeric fields are edited as free text so partial input like "-" or "74."
  // isn't eaten by number parsing mid-keystroke; parsed once on submit.
  const [nums, setNums] = useState<Record<NumKey, string>>(() => {
    const src = { ...EMPTY, ...(initial ?? {}), ...(prefill ?? {}) };
    const str = (v: number | null | undefined) => (v == null ? '' : String(v));
    return {
      lat: str(src.lat), lng: str(src.lng), rating: str(src.rating),
      slope: str(src.slope), gross: str(src.gross), low_score: str(src.low_score),
    };
  });
  const setNum = (k: NumKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNums((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return;
    const lat = parseNum(nums.lat), lng = parseNum(nums.lng);
    const course: Course = {
      ...(d as Omit<Course, 'geo_verified'>),
      id: initial?.id ?? 0,
      lat, lng,
      rating: parseNum(nums.rating),
      slope: parseNum(nums.slope),
      gross: parseNum(nums.gross),
      low_score: parseNum(nums.low_score),
      // If the user provided coordinates, treat them as verified. Preserve the
      // existing verified flag when the coordinates weren't touched.
      geo_verified:
        lat != null && lng != null
          ? initial && initial.lat === lat && initial.lng === lng
            ? initial.geo_verified
            : true
          : false,
    };
    onSave(course);
  };

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <h2>{title}</h2>
        <p className="sub">Name is required — fill in whatever else you know.</p>

        <div className="field">
          <label htmlFor="cf-name">Course name</label>
          <input id="cf-name" value={d.name} autoFocus autoComplete="off"
            onChange={(e) => set('name', e.target.value)} placeholder="e.g. Pinehurst No. 2" required />
        </div>

        <div className="grid3">
          <div className="field"><label>City</label>
            <input value={d.city} onChange={(e) => set('city', e.target.value)} autoComplete="off" /></div>
          <div className="field"><label>State / County</label>
            <input value={d.state} onChange={(e) => set('state', e.target.value)} autoComplete="off" /></div>
          <div className="field"><label>Country</label>
            <input value={d.country} onChange={(e) => set('country', e.target.value)} autoComplete="off" /></div>
        </div>

        <div className="grid2">
          <div className="field"><label>Latitude</label>
            <input value={nums.lat} onChange={setNum('lat')} inputMode="decimal" placeholder="35.4693" /></div>
          <div className="field"><label>Longitude</label>
            <input value={nums.lng} onChange={setNum('lng')} inputMode="decimal" placeholder="-80.9160" /></div>
        </div>

        <div className="grid3">
          <div className="field"><label>Course rating</label>
            <input value={nums.rating} onChange={setNum('rating')} inputMode="decimal" placeholder="74.1" /></div>
          <div className="field"><label>Slope</label>
            <input value={nums.slope} onChange={setNum('slope')} inputMode="numeric" placeholder="133" /></div>
          <div className="field"><label>Last played</label>
            <input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} /></div>
        </div>

        <div className="grid3">
          <div className="field"><label>Low score (best)</label>
            <input value={nums.low_score} onChange={setNum('low_score')} inputMode="numeric" placeholder="82" /></div>
          <div className="field"><label>Recent gross</label>
            <input value={nums.gross} onChange={setNum('gross')} inputMode="numeric" placeholder="88" /></div>
          <div className="field"><label>My rating</label>
            <div className="star-pick">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} className={n <= d.stars ? 'on' : ''}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  onClick={() => set('stars', d.stars === n ? n - 1 : n)}>★</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid2">
          <div className="field"><label>Designer</label>
            <input value={d.designer} onChange={(e) => set('designer', e.target.value)} autoComplete="off" placeholder="Tom Doak" /></div>
          <div className="field"><label>Access</label>
            <select value={d.access} onChange={(e) => set('access', e.target.value as Access)}>
              <option value="public">Public</option>
              <option value="semi">Semi-Private</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        <div className="field checks">
          <label className="chk"><input type="checkbox" checked={d.gd100} onChange={(e) => set('gd100', e.target.checked)} /> Golf Digest Top 100</label>
          <label className="chk"><input type="checkbox" checked={d.gm100} onChange={(e) => set('gm100', e.target.checked)} /> Golf Magazine Top 100</label>
          <label className="chk"><input type="checkbox" checked={d.replay} onChange={(e) => set('replay', e.target.checked)} /> Want to replay</label>
        </div>

        <div className="field"><label>Website</label>
          <input value={d.url} onChange={(e) => set('url', e.target.value)} autoComplete="off" placeholder="https://…" /></div>

        <div className="field"><label>Notes</label>
          <textarea value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Signature hole, who you played with, the shot you'll never forget…" /></div>

        <div className="modal-actions">
          <button type="submit" className="btn-primary">{initial ? 'Save changes' : 'Add course'}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
