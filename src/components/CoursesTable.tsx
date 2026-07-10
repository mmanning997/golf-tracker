import { useMemo, useState } from 'react';
import type { Course } from '../types';
import { ACCESS_LABEL, difficultyOf, fmtDate, googleMapsLink, locationLabel, regionOf } from '../lib/geo';
import { bestScore } from '../lib/stats';

interface Props {
  courses: Course[];
  onEdit: (c: Course) => void;
  onDelete: (id: number) => void;
  onToggleReplay: (id: number) => void;
}

type SortKey = 'idx' | 'name' | 'location' | 'rating' | 'slope' | 'low' | 'stars' | 'date';

const Stars = ({ n }: { n: number }) => (
  <span className="stars" aria-label={`${n} of 5`}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= n ? 's on' : 's'}>★</span>)}
  </span>
);

export default function CoursesTable({ courses, onEdit, onDelete, onToggleReplay }: Props) {
  const [sort, setSort] = useState<SortKey>('idx');
  const [dir, setDir] = useState<1 | -1>(1);
  const [region, setRegion] = useState('all');
  const [diff, setDiff] = useState('all');
  const [rating, setRating] = useState('all');
  const [top, setTop] = useState('all');
  const [acc, setAcc] = useState('all');
  const [replayOnly, setReplayOnly] = useState(false);
  const [q, setQ] = useState('');

  const regions = useMemo(
    () => [...new Set(courses.map(regionOf))].sort((a, b) => a.localeCompare(b)),
    [courses],
  );

  const clickSort = (k: SortKey) => {
    if (k === sort) setDir((d) => (d === 1 ? -1 : 1));
    else { setSort(k); setDir(1); }
  };

  const filtered = useMemo(() => {
    let list = courses.filter((c) => {
      if (region !== 'all' && regionOf(c) !== region) return false;
      if (diff !== 'all' && difficultyOf(c.slope) !== diff) return false;
      if (rating !== 'all' && c.stars !== Number(rating)) return false;
      if (top === 'gd' && !c.gd100) return false;
      if (top === 'gm' && !c.gm100) return false;
      if (top === 'any' && !(c.gd100 || c.gm100)) return false;
      if (acc !== 'all' && c.access !== acc) return false;
      if (replayOnly && !c.replay) return false;
      if (q.trim()) {
        const hay = `${c.name} ${locationLabel(c)} ${c.designer}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });

    const val = (c: Course): string | number => {
      switch (sort) {
        case 'name': return c.name.toLowerCase();
        case 'location': return locationLabel(c).toLowerCase();
        case 'rating': return c.rating ?? -1;
        case 'slope': return c.slope ?? -1;
        case 'low': return bestScore(c) ?? Number.MAX_SAFE_INTEGER;
        case 'stars': return c.stars;
        case 'date': return c.date || '';
        default: return c.id;
      }
    };
    list = [...list].sort((a, b) => {
      const va: any = val(a);
      const vb: any = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return list;
  }, [courses, region, diff, rating, top, acc, replayOnly, q, sort, dir]);

  const arrow = (k: SortKey) => (sort === k ? (dir === 1 ? ' ▲' : ' ▼') : '');
  const th = (k: SortKey, label: string, cls = '') => (
    <th className={cls} onClick={() => clickSort(k)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') clickSort(k); }}>{label}{arrow(k)}</th>
  );

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
          <option value="all">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Difficulty">
          <option value="all">Any difficulty</option>
          <option value="easy">Easy (≤134)</option>
          <option value="moderate">Moderate (135–144)</option>
          <option value="hard">Hard (≥145)</option>
        </select>
        <select value={rating} onChange={(e) => setRating(e.target.value)} aria-label="My rating">
          <option value="all">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
        </select>
        <select value={top} onChange={(e) => setTop(e.target.value)} aria-label="Top 100">
          <option value="all">Top 100: any</option>
          <option value="any">Top 100 (either)</option>
          <option value="gd">Golf Digest 100</option>
          <option value="gm">Golf Magazine 100</option>
        </select>
        <select value={acc} onChange={(e) => setAcc(e.target.value)} aria-label="Access">
          <option value="all">Any access</option>
          <option value="public">Public</option>
          <option value="semi">Semi-Private</option>
          <option value="private">Private</option>
        </select>
        <label className="chk inline"><input type="checkbox" checked={replayOnly} onChange={(e) => setReplayOnly(e.target.checked)} /> Replay</label>
        <span className="count">{filtered.length} of {courses.length}</span>
      </div>

      <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              {th('idx', '#', 'num')}
              {th('name', 'Course')}
              {th('location', 'Location')}
              {th('rating', 'Rating', 'num')}
              {th('slope', 'Slope', 'num')}
              {th('low', 'Best', 'num')}
              {th('stars', 'My rating')}
              {th('date', 'Last played')}
              <th className="actions-h">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id}>
                <td className="num muted">{i + 1}</td>
                <td>
                  <div className="cname">
                    {c.name}
                    {c.gd100 && <span className="tag gd" title="Golf Digest Top 100">GD</span>}
                    {c.gm100 && <span className="tag gm" title="Golf Magazine Top 100">GM</span>}
                    {c.replay && <span className="tag replay" title="Want to replay">↺</span>}
                    {!c.geo_verified && (c.lat == null) && <span className="tag warn" title="No coordinates yet">⚑</span>}
                  </div>
                  {c.notes && <div className="cnotes">{c.notes}</div>}
                </td>
                <td>{locationLabel(c)}<span className="access-mini"> · {ACCESS_LABEL[c.access]}</span></td>
                <td className="num">{c.rating ?? '—'}</td>
                <td className="num">{c.slope ?? '—'}</td>
                <td className="num">{bestScore(c) ?? '—'}</td>
                <td><Stars n={c.stars} /></td>
                <td className="nowrap">{fmtDate(c.date)}</td>
                <td className="actions">
                  <a className="ibtn" href={googleMapsLink(c)} target="_blank" rel="noreferrer" title="Google Maps">📍</a>
                  {c.url && <a className="ibtn" href={c.url} target="_blank" rel="noreferrer" title="Website">🔗</a>}
                  <button className={`ibtn ${c.replay ? 'active' : ''}`} title="Toggle replay" onClick={() => onToggleReplay(c.id)}>↺</button>
                  <button className="ibtn" title="Edit" onClick={() => onEdit(c)}>✎</button>
                  <button className="ibtn danger" title="Delete" onClick={() => { if (confirm(`Delete "${c.name}"?`)) onDelete(c.id); }}>✕</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="empty">No courses match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
