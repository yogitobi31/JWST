import { useMemo, useState } from 'react';

type Grade = 'A' | 'B' | 'C';
type CandidateType = 'Little Red Dot-like' | 'Red compact source' | 'Possible artifact' | 'Possible lensing feature' | 'Other';

interface Candidate {
  id: string;
  x: number;
  y: number;
  ra?: string;
  dec?: string;
  grade: Grade;
  type: CandidateType;
  note: string;
  timestamp: string;
}

const CANDIDATE_TYPES: CandidateType[] = ['Little Red Dot-like', 'Red compact source', 'Possible artifact', 'Possible lensing feature', 'Other'];
const STORAGE_KEY = 'jwst-anomaly-atlas-v1';

function usePersistedCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as Candidate[]; } catch { return []; }
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

  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const imageSrc = '/sample-deep-field.svg';

  const addCandidate = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget.getBoundingClientRect();
    const x = Math.round(event.clientX - target.left);
    const y = Math.round(event.clientY - target.top);
    const id = `cand-${crypto.randomUUID().slice(0, 8)}`;
    const candidate: Candidate = { id, x, y, grade: 'B', type: 'Little Red Dot-like', note: '', timestamp: new Date().toISOString() };
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
      datasetName: 'Sample Deep Field',
      imageSource: imageSrc,
      dateExported: new Date().toISOString(),
      disclaimer: 'Candidate list only. Not a confirmed astronomical discovery.',
      candidates,
    };
    downloadFile('jwst-candidates.json', JSON.stringify(payload, null, 2), 'application/json');
  };

  const exportCsv = () => {
    const header = ['id', 'x', 'y', 'ra', 'dec', 'grade', 'type', 'note', 'timestamp'];
    const rows = candidates.map((c) => [c.id, c.x, c.y, c.ra ?? '', c.dec ?? '', c.grade, c.type, c.note.replaceAll('"', '""'), c.timestamp]);
    const metadata = [
      ['project name', 'JWST Deep Field Anomaly Atlas'],
      ['dataset name', 'Sample Deep Field'],
      ['image source', imageSrc],
      ['date exported', new Date().toISOString()],
      ['disclaimer', 'Candidate list only. Not a confirmed astronomical discovery.'],
      [],
    ];
    const csv = [...metadata.map((m) => m.join(',')), header.join(','), ...rows.map((r) => r.map((v) => `"${String(v)}"`).join(','))].join('\n');
    downloadFile('jwst-candidates.csv', csv, 'text/csv');
  };

  return (
    <div className="app-shell">
      <header className="topbar"><h1>JWST Deep Field Anomaly Atlas</h1><p>Public data inspection workspace for visual anomaly candidates (not a confirmed discovery).</p></header>
      <main className="layout">
        <section className="viewer-wrap">
          <div className="viewer" onClick={addCandidate}>
            <img src={imageSrc} alt="JWST sample deep field" />
            {candidates.map((c) => <button key={c.id} style={{ left: `${c.x}px`, top: `${c.y}px` }} className={`marker ${c.id === selectedId ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }} aria-label={`Candidate ${c.id}`} />)}
          </div>
          <div className="note">Marked objects are visual candidates only. Each candidate must be cross-matched with SIMBAD, VizieR, MAST, and relevant literature before any scientific claim.</div>
        </section>
        <aside className="panel">
          <div className="panel-header"><h2>Candidates</h2><div className="actions"><button onClick={exportJson}>Export JSON</button><button onClick={exportCsv}>Export CSV</button><button disabled>Load FITS / MAST data (coming soon)</button></div></div>
          <ul>{candidates.map((c, idx) => <li key={c.id}><button className={c.id === selectedId ? 'row selected' : 'row'} onClick={() => setSelectedId(c.id)}>{idx + 1}. {c.type} · {c.grade} · ({c.x},{c.y})</button></li>)}</ul>
          {selected && <div className="editor"><h3>Edit candidate {selectedIndex + 1}</h3>
            <label>Grade<select value={selected.grade} onChange={(e) => updateSelected({ grade: e.target.value as Grade })}><option>A</option><option>B</option><option>C</option></select></label>
            <label>Type<select value={selected.type} onChange={(e) => updateSelected({ type: e.target.value as CandidateType })}>{CANDIDATE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>Note<textarea rows={3} value={selected.note} onChange={(e) => updateSelected({ note: e.target.value })} /></label>
            <label>RA (optional)<input value={selected.ra ?? ''} onChange={(e) => updateSelected({ ra: e.target.value })} /></label>
            <label>Dec (optional)<input value={selected.dec ?? ''} onChange={(e) => updateSelected({ dec: e.target.value })} /></label>
            <button className="danger" onClick={() => { setCandidates(candidates.filter((x) => x.id !== selected.id)); setSelectedId(null); }}>Delete candidate</button>
          </div>}
        </aside>
      </main>
      {/* TODO: FITS image loading support. */}
      {/* TODO: WCS pixel-to-sky coordinate conversion. */}
      {/* TODO: MAST API search integration. */}
      {/* TODO: SIMBAD/VizieR cross-match pipeline. */}
      {/* TODO: Multi-filter color comparison workflows. */}
      {/* TODO: Difference imaging / transient search tools. */}
    </div>
  );
}

function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
