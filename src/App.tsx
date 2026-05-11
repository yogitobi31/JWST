import { useMemo, useState } from 'react';

type Grade = 'A' | 'B' | 'C';
type CandidateType = 'Little Red Dot-like' | 'Red compact source' | 'Possible artifact' | 'Possible lensing feature' | 'Other';
type VerificationStatus =
  | 'Unchecked'
  | 'Needs catalog cross-match'
  | 'Possible known source'
  | 'Possible artifact'
  | 'High-priority candidate';

interface Candidate {
  id: string;
  x: number;
  y: number;
  ra: string;
  dec: string;
  datasetName: string;
  filterBand: string;
  grade: Grade;
  type: CandidateType;
  verificationStatus: VerificationStatus;
  note: string;
  timestamp: string;
}

const CANDIDATE_TYPES: CandidateType[] = ['Little Red Dot-like', 'Red compact source', 'Possible artifact', 'Possible lensing feature', 'Other'];
const VERIFICATION_STATUSES: VerificationStatus[] = [
  'Unchecked',
  'Needs catalog cross-match',
  'Possible known source',
  'Possible artifact',
  'High-priority candidate',
];
const STORAGE_KEY = 'jwst-anomaly-atlas-v2';
const DEMO_DATASET = 'Demo Deep Field';

function usePersistedCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Candidate[];
    } catch {
      return [];
    }
  });
  const update = (next: Candidate[]) => {
    setCandidates(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  return [candidates, update] as const;
}

export function App() {
  const [candidates, setCandidates] = usePersistedCandidates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string>('Not exported this session');

  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const highPriorityCount = candidates.filter((c) => c.grade === 'A').length;

  const addCandidate = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget.getBoundingClientRect();
    const x = Math.round(event.clientX - target.left);
    const y = Math.round(event.clientY - target.top);
    const id = `cand-${crypto.randomUUID().slice(0, 8)}`;
    const candidate: Candidate = {
      id,
      x,
      y,
      ra: '',
      dec: '',
      datasetName: DEMO_DATASET,
      filterBand: 'F200W (placeholder)',
      grade: 'B',
      type: 'Little Red Dot-like',
      verificationStatus: 'Unchecked',
      note: '',
      timestamp: new Date().toISOString(),
    };
    const next = [candidate, ...candidates];
    setCandidates(next);
    setSelectedId(id);
  };

  const selectedIndex = useMemo(() => candidates.findIndex((c) => c.id === selectedId), [candidates, selectedId]);

  const updateSelected = (patch: Partial<Candidate>) => {
    if (!selected) return;
    setCandidates(candidates.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)));
  };

  const exportJson = () => {
    const payload = {
      projectName: 'JWST Deep Field Anomaly Atlas',
      datasetName: DEMO_DATASET,
      dateExported: new Date().toISOString(),
      disclaimer: 'Candidate list only. Not a confirmed astronomical discovery.',
      candidates,
    };
    downloadFile('jwst-candidates.json', JSON.stringify(payload, null, 2), 'application/json');
    setLastExport(`JSON exported ${new Date().toLocaleTimeString()}`);
  };

  const exportCsv = () => {
    const header = ['id', 'x', 'y', 'ra', 'dec', 'datasetName', 'filterBand', 'grade', 'type', 'verificationStatus', 'note', 'timestamp'];
    const rows = candidates.map((c) => [
      c.id,
      c.x,
      c.y,
      c.ra,
      c.dec,
      c.datasetName,
      c.filterBand,
      c.grade,
      c.type,
      c.verificationStatus,
      c.note.split('"').join('""'),
      c.timestamp,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.map((v) => `"${String(v)}"`).join(','))].join('\n');
    downloadFile('jwst-candidates.csv', csv, 'text/csv');
    setLastExport(`CSV exported ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>JWST Deep Field Anomaly Atlas</h1>
        <p>Public data inspection workspace for visual anomaly candidates (not a confirmed discovery).</p>
      </header>
      <section className="status-strip">
        <span>Dataset: {DEMO_DATASET}</span>
        <span>Mode: Visual Candidate Inspection</span>
        <span>Candidates: {candidates.length}</span>
        <span>High priority: {highPriorityCount}</span>
        <span>{lastExport}</span>
      </section>
      <main className="layout">
        <section className="viewer-wrap">
          <div className="viewer" onClick={addCandidate}>
            <DeepFieldCanvas />
            {candidates.map((c) => (
              <button
                key={c.id}
                style={{ left: `${c.x}px`, top: `${c.y}px` }}
                className={`marker marker-${c.grade.toLowerCase()} ${c.id === selectedId ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(c.id);
                }}
                aria-label={`Candidate ${c.id}`}
              />
            ))}
          </div>
          <div className="note">Candidate markers are visual annotations only. They are not confirmed astronomical discoveries. Cross-match with SIMBAD, VizieR, MAST, and literature is required.</div>
        </section>
        <aside className="panel">
          <div className="panel-header">
            <h2>Candidates</h2>
            <div className="actions"><button onClick={exportJson}>Export JSON</button><button onClick={exportCsv}>Export CSV</button></div>
          </div>
          <ul>
            {candidates.map((c, idx) => (
              <li key={c.id}>
                <button className={c.id === selectedId ? 'row selected' : 'row'} onClick={() => setSelectedId(c.id)}>
                  <span className="row-title">#{idx + 1} · {c.grade} · {c.type}</span>
                  <span className="row-sub">x:{c.x} y:{c.y} · {c.verificationStatus}</span>
                </button>
              </li>
            ))}
          </ul>
          {selected && (
            <div className="editor">
              <h3>Edit candidate {selectedIndex + 1}</h3>
              <label>Pixel X<input value={selected.x} onChange={(e) => updateSelected({ x: Number(e.target.value) || 0 })} /></label>
              <label>Pixel Y<input value={selected.y} onChange={(e) => updateSelected({ y: Number(e.target.value) || 0 })} /></label>
              <label>RA placeholder<input value={selected.ra} onChange={(e) => updateSelected({ ra: e.target.value })} /></label>
              <label>Dec placeholder<input value={selected.dec} onChange={(e) => updateSelected({ dec: e.target.value })} /></label>
              <label>Dataset name<input value={selected.datasetName} onChange={(e) => updateSelected({ datasetName: e.target.value })} /></label>
              <label>Filter / band placeholder<input value={selected.filterBand} onChange={(e) => updateSelected({ filterBand: e.target.value })} /></label>
              <label>Grade<select value={selected.grade} onChange={(e) => updateSelected({ grade: e.target.value as Grade })}><option>A</option><option>B</option><option>C</option></select></label>
              <label>Type<select value={selected.type} onChange={(e) => updateSelected({ type: e.target.value as CandidateType })}>{CANDIDATE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label>Verification status<select value={selected.verificationStatus} onChange={(e) => updateSelected({ verificationStatus: e.target.value as VerificationStatus })}>{VERIFICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label>Notes<textarea rows={3} value={selected.note} onChange={(e) => updateSelected({ note: e.target.value })} /></label>
              <section className="workflow">
                <h4>Candidate Review Workflow</h4>
                <label><input type="checkbox" /> visual anomaly marked</label>
                <label><input type="checkbox" /> coordinates recorded</label>
                <label><input type="checkbox" /> multi-filter comparison needed</label>
                <label><input type="checkbox" /> catalog cross-match needed</label>
                <label><input type="checkbox" /> literature review needed</label>
              </section>
              <button className="danger" onClick={() => { setCandidates(candidates.filter((x) => x.id !== selected.id)); setSelectedId(null); }}>Delete candidate</button>
            </div>
          )}
        </aside>
      </main>
      {/* TODO: Replace procedural demo with real JWST image loading pipeline. */}
      {/* TODO: Add FITS support for calibrated exposures and cutouts. */}
      {/* TODO: Add WCS pixel-to-RA/Dec conversion and coordinate validation. */}
      {/* TODO: Add MAST API integration for dataset retrieval. */}
      {/* TODO: Add SIMBAD/VizieR automated cross-match helper. */}
      {/* TODO: Add multi-filter color composite comparison tools. */}
    </div>
  );
}

function DeepFieldCanvas() {
  const seed = 42;
  const points = createFieldPoints(seed);
  return (
    <svg viewBox="0 0 1200 800" className="deep-field" aria-label="Procedural JWST-like deep field demo image">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="40%" r="70%"><stop offset="0%" stopColor="#131a2c" /><stop offset="100%" stopColor="#05070c" /></radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bgGlow)" />
      {points.galaxies.map((g) => <ellipse key={g.id} cx={g.x} cy={g.y} rx={g.rx} ry={g.ry} fill={g.fill} opacity={g.opacity} transform={`rotate(${g.rot} ${g.x} ${g.y})`} />)}
      {points.redCompacts.map((s) => <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill="#d36a70" opacity={0.8} />)}
      {points.blueWhites.map((s) => <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill="#dce9ff" opacity={0.75} />)}
      {points.smudges.map((s) => <ellipse key={s.id} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill="#8f9bc2" opacity={0.18} />)}
    </svg>
  );
}

function createFieldPoints(seed: number) {
  let value = seed;
  const rand = () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
  const galaxies = Array.from({ length: 320 }, (_, i) => ({
    id: `g-${i}`,
    x: Math.round(rand() * 1200),
    y: Math.round(rand() * 800),
    rx: 0.4 + rand() * 2.4,
    ry: 0.4 + rand() * 1.8,
    rot: rand() * 180,
    fill: rand() > 0.65 ? '#ad7e67' : '#8ea1d7',
    opacity: 0.12 + rand() * 0.25,
  }));
  const redCompacts = Array.from({ length: 120 }, (_, i) => ({ id: `r-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), r: 0.5 + rand() * 1.3 }));
  const blueWhites = Array.from({ length: 140 }, (_, i) => ({ id: `b-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), r: 0.5 + rand() * 1.5 }));
  const smudges = Array.from({ length: 18 }, (_, i) => ({ id: `s-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), rx: 10 + rand() * 26, ry: 4 + rand() * 16 }));
  return { galaxies, redCompacts, blueWhites, smudges };
}

function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
