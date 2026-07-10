import { useEffect, useRef, useState } from 'react';
import type { Course, DataSet, MustPlay, View } from './types';
import { downloadFile, loadData, nextId, resetData, saveData } from './lib/storage';
import { exportCSV, importCSV } from './lib/csv';
import { exportKML } from './lib/kml';
import CoursesTable from './components/CoursesTable';
import MustPlayView from './components/MustPlay';
import Stats from './components/Stats';
import MapView from './components/MapView';
import CourseForm from './components/CourseForm';

type EditState =
  | { mode: 'closed' }
  | { mode: 'course'; initial: Course | null; prefill?: Partial<Course>; fromMustplay?: number };

const stamp = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [data, setData] = useState<DataSet>(() => loadData());
  const [view, setView] = useState<View>('courses');
  const [edit, setEdit] = useState<EditState>({ mode: 'closed' });
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveData(data); }, [data]);

  useEffect(() => {
    const saved = localStorage.getItem('golf-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // ---- course ops ----
  const saveCourse = (c: Course) => {
    setData((d) => {
      const isNew = !c.id;
      const course: Course = { ...c, id: c.id || nextId(d.courses) };
      const courses = isNew ? [...d.courses, course] : d.courses.map((x) => (x.id === course.id ? course : x));
      const src = edit.mode === 'course' ? edit.fromMustplay : undefined;
      const mustplay = src != null ? d.mustplay.filter((m) => m.id !== src) : d.mustplay;
      return { courses, mustplay };
    });
    setEdit({ mode: 'closed' });
  };
  const deleteCourse = (id: number) => setData((d) => ({ ...d, courses: d.courses.filter((c) => c.id !== id) }));
  const toggleReplay = (id: number) =>
    setData((d) => ({ ...d, courses: d.courses.map((c) => (c.id === id ? { ...c, replay: !c.replay } : c)) }));

  // ---- must play ops ----
  const saveMustplay = (m: MustPlay) =>
    setData((d) => {
      const exists = d.mustplay.some((x) => x.id === m.id);
      return { ...d, mustplay: exists ? d.mustplay.map((x) => (x.id === m.id ? m : x)) : [...d.mustplay, m] };
    });
  const deleteMustplay = (id: number) => setData((d) => ({ ...d, mustplay: d.mustplay.filter((m) => m.id !== id) }));
  const promote = (m: MustPlay) =>
    setEdit({
      mode: 'course', initial: null, fromMustplay: m.id,
      prefill: {
        name: m.name, city: m.city, state: m.state, country: m.country, lat: m.lat, lng: m.lng,
        access: m.access, gd100: m.gd100, gm100: m.gm100, url: m.url, designer: m.designer, date: stamp(),
      },
    });

  // ---- data io ----
  const doExportCSV = () => downloadFile('golf-tracker.csv', exportCSV(data), 'text/csv');
  const doExportJSON = () => downloadFile('golf-tracker.json', JSON.stringify(data, null, 2), 'application/json');
  const doExportKML = () => downloadFile('golf-tracker.kml', exportKML(data), 'application/vnd.google-earth.kml+xml');
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const next = file.name.toLowerCase().endsWith('.json') ? (JSON.parse(text) as DataSet) : importCSV(text);
        if (!next || !Array.isArray(next.courses) || !Array.isArray(next.mustplay)) throw new Error('Unrecognized file');
        if (confirm(`Import ${next.courses.length} played + ${next.mustplay.length} must-play courses? This replaces your current data.`)) {
          setData(next);
          setView('courses');
        }
      } catch (err) {
        alert('Could not import that file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const doReset = () => {
    if (confirm('Reset to the original seeded data? This discards your changes.')) setData(resetData());
    setMenuOpen(false);
  };
  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute('data-theme')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('golf-theme', next);
  };

  const TABS: { key: View; label: string }[] = [
    { key: 'courses', label: `Courses (${data.courses.length})` },
    { key: 'mustplay', label: `Must Play (${data.mustplay.length})` },
    { key: 'stats', label: 'Stats' },
    { key: 'map', label: 'Map' },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-flag" aria-hidden="true" />
          <div>
            <div className="brand-eyebrow">The Clubhouse Ledger</div>
            <h1>Matt's Golf Tracker</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary sm" onClick={() => setEdit({ mode: 'course', initial: null })}>+ Add course</button>
          <div className="menu-wrap">
            <button className="btn-ghost sm" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="true" aria-expanded={menuOpen}>Data ▾</button>
            {menuOpen && (
              <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { fileRef.current?.click(); setMenuOpen(false); }}>Import CSV / JSON…</button>
                <button onClick={() => { doExportCSV(); setMenuOpen(false); }}>Export CSV</button>
                <button onClick={() => { doExportJSON(); setMenuOpen(false); }}>Export JSON</button>
                <button onClick={() => { doExportKML(); setMenuOpen(false); }}>Export KML (Google My Maps)</button>
                <hr />
                <button onClick={doReset}>Reset to seed data</button>
              </div>
            )}
          </div>
          <button className="btn-ghost sm icon-only" onClick={toggleTheme} title="Toggle light / dark" aria-label="Toggle theme">◑</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${view === t.key ? 'active' : ''}`} onClick={() => setView(t.key)}>{t.label}</button>
        ))}
      </nav>

      <main className="content">
        {view === 'courses' && (
          <CoursesTable courses={data.courses} onEdit={(c) => setEdit({ mode: 'course', initial: c })}
            onDelete={deleteCourse} onToggleReplay={toggleReplay} />
        )}
        {view === 'mustplay' && (
          <MustPlayView mustplay={data.mustplay} courses={data.courses} onSave={saveMustplay} onDelete={deleteMustplay} onPlayed={promote} />
        )}
        {view === 'stats' && <Stats data={data} />}
        {view === 'map' && <MapView data={data} onExportKML={doExportKML} />}
      </main>

      {edit.mode === 'course' && (
        <CourseForm
          initial={edit.initial}
          prefill={edit.prefill}
          title={edit.initial ? 'Edit course' : edit.fromMustplay != null ? 'Log a played course' : 'Add a course'}
          onSave={saveCourse}
          onClose={() => setEdit({ mode: 'closed' })}
        />
      )}

      <input ref={fileRef} type="file" accept=".csv,.json" hidden onChange={onImportFile} />
    </div>
  );
}
