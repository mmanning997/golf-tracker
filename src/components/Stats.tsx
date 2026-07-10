import type { DataSet } from '../types';
import { evaluateBadges } from '../lib/badges';
import { evaluateCollections } from '../lib/collections';
import {
  bestDifferentials, byDifficulty, byRegion, designerLeaderboard, fiveStars, kpis,
  MUSTPLAY_STATUS_LABEL, mustplayBreakdown, ratingHistogram, replayList, top100, type Bucket,
} from '../lib/stats';
import { DIFFICULTY_LABEL, locationLabel } from '../lib/geo';

function Bars({ items, max, accent }: { items: Bucket[]; max?: number; accent?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="bars">
      {items.map((b) => (
        <div className="bar-row" key={b.label}>
          <span className="bar-label">{b.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(b.count / top) * 100}%`, background: accent }} /></span>
          <span className="bar-num">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function Stats({ data }: { data: DataSet }) {
  const k = kpis(data.courses);
  const badges = evaluateBadges(data);
  const regions = byRegion(data.courses);
  const diff = byDifficulty(data.courses).map((b) => ({ ...b, label: DIFFICULTY_LABEL[b.label as keyof typeof DIFFICULTY_LABEL] ?? b.label }));
  const hist = ratingHistogram(data.courses).map((b) => ({ ...b, label: `${b.label}★` }));
  const designers = designerLeaderboard(data.courses).filter((d) => d.count >= 2).slice(0, 12);
  const five = fiveStars(data.courses);
  const replays = replayList(data.courses);
  const mp = mustplayBreakdown(data.mustplay).map((b) => ({ ...b, label: MUSTPLAY_STATUS_LABEL[b.label] ?? b.label }));
  const t = top100(data);
  const diffs = bestDifferentials(data.courses).slice(0, 8);
  const collections = evaluateCollections(data);

  return (
    <div className="stats-view">
      <div className="kpi-row">
        <div className="kpi"><div className="kpi-num">{k.played}</div><div className="kpi-lbl">Courses played</div></div>
        <div className="kpi"><div className="kpi-num">{k.withScores}</div><div className="kpi-lbl">With scores</div></div>
        <div className="kpi"><div className="kpi-num">{k.best ?? '—'}</div><div className="kpi-lbl">Best round</div></div>
        <div className="kpi"><div className="kpi-num">{k.avg ?? '—'}</div><div className="kpi-lbl">Avg score</div></div>
      </div>

      {diffs.length > 0 && (
        <section className="panel">
          <h3>Giant-killer rounds</h3>
          <p className="panel-sub">Best handicap differentials — (score − rating) × 113 ÷ slope, the number your index is built from. Lower is better; hard courses count for more.</p>
          <ol className="diff-list">
            {diffs.map((d, i) => (
              <li key={d.course.id} className="diff-row">
                <span className="diff-rank">{i + 1}</span>
                <span className="diff-course">
                  <span className="diff-name">{d.course.name}</span>
                  <span className="diff-meta">{d.score} on a {d.course.rating}/{d.course.slope}</span>
                </span>
                <span className={`diff-num ${i === 0 ? 'best' : ''}`}>{d.diff.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="panel">
        <h3>Badges</h3>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.id} className={`badge ${b.earned ? 'earned' : 'locked'}`} title={b.desc}>
              <span className="badge-icon">{b.icon}</span>
              <div className="badge-body">
                <div className="badge-name">{b.name}</div>
                <div className="badge-desc">{b.desc}</div>
                {b.target > 1 && (
                  <div className="badge-prog">
                    <span className="prog-track"><span className="prog-fill" style={{ width: `${(b.current / b.target) * 100}%` }} /></span>
                    <span className="prog-num">{b.current}/{b.target}</span>
                  </div>
                )}
              </div>
              {b.earned && <span className="badge-check">✓</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Collections</h3>
        <p className="panel-sub">Sets worth completing. ⛳ played · 🎯 on your list · ◌ not tracked yet.</p>
        <div className="collections">
          {collections.map((c) => (
            <div key={c.id} className={`coll ${c.complete ? 'complete' : ''}`}>
              <div className="coll-head">
                <span className="coll-name">{c.name}{c.complete && ' 🏆'}</span>
                <span className="coll-count">{c.played}/{c.total}</span>
              </div>
              <div className="coll-desc">{c.desc}</div>
              <div className="prog-track coll-track"><span className="prog-fill" style={{ width: `${(c.played / c.total) * 100}%` }} /></div>
              <div className="coll-items">
                {c.items.map((it) => (
                  <span key={it.label} className={`coll-item ${it.status}`}>
                    {it.status === 'played' ? '⛳ ' : it.status === 'wishlist' ? '🎯 ' : '◌ '}{it.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="panel-grid">
        <section className="panel"><h3>By region</h3><Bars items={regions} accent="var(--turf)" /></section>
        <section className="panel"><h3>By difficulty (slope)</h3><Bars items={diff} accent="var(--sand-strong)" /></section>
        <section className="panel"><h3>My ratings</h3><Bars items={hist} accent="var(--gold)" /></section>
        <section className="panel"><h3>Must Play breakdown</h3><Bars items={mp} accent="var(--flag)" /></section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h3>Designer leaderboard</h3>
          {designers.length ? <Bars items={designers} accent="var(--turf)" /> : <p className="muted">No designer has 2+ courses yet.</p>}
        </section>
        <section className="panel">
          <h3>Top 100 courses</h3>
          <div className="t100">
            <div><h4>Golf Digest — played ({t.gdPlayed.length})</h4>
              <ul className="mini">{t.gdPlayed.map((c) => <li key={c.id}>{c.name}</li>)}{!t.gdPlayed.length && <li className="muted">none yet</li>}</ul></div>
            <div><h4>Golf Magazine — played ({t.gmPlayed.length})</h4>
              <ul className="mini">{t.gmPlayed.map((c) => <li key={c.id}>{c.name}</li>)}{!t.gmPlayed.length && <li className="muted">none yet</li>}</ul></div>
            {(t.gdWish.length > 0 || t.gmWish.length > 0) && (
              <div><h4>On the wishlist</h4>
                <ul className="mini">{[...t.gdWish, ...t.gmWish].map((m) => <li key={`w${m.id}`}>{m.name}</li>)}</ul></div>
            )}
          </div>
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h3>Five-star courses ({five.length})</h3>
          <ul className="mini two-col">{five.map((c) => <li key={c.id}>★ {c.name} <span className="muted">— {locationLabel(c)}</span></li>)}</ul>
        </section>
        <section className="panel">
          <h3>Want to replay ({replays.length})</h3>
          <ul className="mini two-col">{replays.map((c) => <li key={c.id}>↺ {c.name}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}
