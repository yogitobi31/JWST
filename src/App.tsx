import { useMemo, useState } from 'react';

type Grade = 'A' | 'B' | 'C';
type CandidateType = 'Little Red Dot-like' | 'Red compact source' | 'Possible artifact' | 'Possible lensing feature' | 'Other';
type VerificationStatus = 'Unchecked' | 'Needs catalog cross-match' | 'Possible known source' | 'Possible artifact' | 'High-priority candidate';
type SourceType = 'demo' | 'public-image' | 'fits-coming-soon';
type ReasonTag = 'Very red compact source' | 'Faint in short wavelength' | 'Bright in long wavelength' | 'Isolated source' | 'Near extended galaxy' | 'Possible artifact' | 'Possible diffraction feature' | 'Needs multi-filter check' | 'Needs catalog cross-match';

type ReviewChecklist = {
  visualAnomalyMarked: boolean;
  coordinatesRecorded: boolean;
  multiFilterComparisonNeeded: boolean;
  catalogCrossMatchNeeded: boolean;
  literatureReviewNeeded: boolean;
  artifactCheckNeeded: boolean;
};

interface Dataset { id: string; displayName: string; fieldName: string; sourceType: SourceType; description: string; filters: string; officialDataUrl: string; notes: string; seed: number; }
interface Candidate { id: string; x: number; y: number; ra: string; dec: string; datasetId: string; datasetName: string; filterBand: string; grade: Grade; type: CandidateType; verificationStatus: VerificationStatus; reasonTags: ReasonTag[]; reviewChecklist: ReviewChecklist; note: string; timestamp: string; }

const STORAGE_KEY = 'jwst-anomaly-atlas-v3';
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 800;
const DATASETS: Dataset[] = [
  { id: 'demo-deep-field', displayName: 'Demo Deep Field', fieldName: 'Demo Deep Field', sourceType: 'demo', description: 'Procedural demo deep field for workflow testing.', filters: 'F090W/F150W/F200W placeholder', officialDataUrl: 'https://example.org/demo', notes: 'Fallback local generated field.', seed: 42 },
  { id: 'jades-demo', displayName: 'JADES Demo Placeholder', fieldName: 'JADES', sourceType: 'public-image', description: 'JADES placeholder panel for public image integration.', filters: 'JADES filter set placeholder', officialDataUrl: 'https://example.org/jades', notes: 'Pending public cutout fetch.', seed: 77 },
  { id: 'ceers-demo', displayName: 'CEERS Demo Placeholder', fieldName: 'CEERS', sourceType: 'public-image', description: 'CEERS placeholder panel for public image integration.', filters: 'CEERS filter set placeholder', officialDataUrl: 'https://example.org/ceers', notes: 'Pending public cutout fetch.', seed: 108 },
  { id: 'smacs-0723-demo', displayName: 'SMACS 0723 Demo Placeholder', fieldName: 'SMACS 0723', sourceType: 'fits-coming-soon', description: 'SMACS 0723 placeholder for FITS-ready workflow.', filters: 'SMACS filter stack placeholder', officialDataUrl: 'https://example.org/smacs0723', notes: 'WCS/FITS pipeline queued.', seed: 15 },
  { id: 'cosmos-web-demo', displayName: 'COSMOS-Web Demo Placeholder', fieldName: 'COSMOS-Web', sourceType: 'fits-coming-soon', description: 'COSMOS-Web placeholder workspace for scale testing.', filters: 'COSMOS-Web filter stack placeholder', officialDataUrl: 'https://example.org/cosmos-web', notes: 'Large mosaic support planned.', seed: 256 },
];
const CANDIDATE_TYPES: CandidateType[] = ['Little Red Dot-like', 'Red compact source', 'Possible artifact', 'Possible lensing feature', 'Other'];
const VERIFICATION_STATUSES: VerificationStatus[] = ['Unchecked', 'Needs catalog cross-match', 'Possible known source', 'Possible artifact', 'High-priority candidate'];
const REASON_TAGS: ReasonTag[] = ['Very red compact source', 'Faint in short wavelength', 'Bright in long wavelength', 'Isolated source', 'Near extended galaxy', 'Possible artifact', 'Possible diffraction feature', 'Needs multi-filter check', 'Needs catalog cross-match'];

const defaultChecklist = (): ReviewChecklist => ({ visualAnomalyMarked: false, coordinatesRecorded: false, multiFilterComparisonNeeded: false, catalogCrossMatchNeeded: false, literatureReviewNeeded: false, artifactCheckNeeded: false });

function usePersistedCandidates() {
  const [byDataset, setByDataset] = useState<Record<string, Candidate[]>>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) as Record<string, Candidate[]>; } catch { return {}; }
  });
  const update = (next: Record<string, Candidate[]>) => { setByDataset(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  return [byDataset, update] as const;
}

export function App() {
  const [activeDatasetId, setActiveDatasetId] = useState(DATASETS[0].id);
  const [byDataset, setByDataset] = usePersistedCandidates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState('Not exported this session');
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const activeDataset = DATASETS.find((d) => d.id === activeDatasetId) ?? DATASETS[0];
  const candidates = byDataset[activeDataset.id] ?? [];
  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const highPriorityCount = candidates.filter((c) => c.grade === 'A').length;

  const replaceCandidates = (next: Candidate[]) => setByDataset({ ...byDataset, [activeDataset.id]: next });
  const selectedIndex = useMemo(() => candidates.findIndex((c) => c.id === selectedId), [candidates, selectedId]);
  const checklistDone = selected ? Object.values(selected.reviewChecklist).filter(Boolean).length : 0;

  const addCandidate = (event: React.MouseEvent<HTMLDivElement>) => {
    const surface = event.currentTarget;
    const svg = surface.querySelector('svg');
    if (!svg) return;
    const surfaceRect = surface.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const x = Math.max(0, Math.min(IMAGE_WIDTH, Math.round((event.clientX - surfaceRect.left + surface.scrollLeft) * (IMAGE_WIDTH / svgRect.width))));
    const y = Math.max(0, Math.min(IMAGE_HEIGHT, Math.round((event.clientY - surfaceRect.top + surface.scrollTop) * (IMAGE_HEIGHT / svgRect.height))));
    const id = `cand-${crypto.randomUUID().slice(0, 8)}`;
    const candidate: Candidate = { id, x, y, ra: '', dec: '', datasetId: activeDataset.id, datasetName: activeDataset.displayName, filterBand: activeDataset.filters, grade: 'B', type: 'Little Red Dot-like', verificationStatus: 'Unchecked', reasonTags: [], reviewChecklist: defaultChecklist(), note: '', timestamp: new Date().toISOString() };
    replaceCandidates([candidate, ...candidates]);
    setSelectedId(id);
  };

  const updateSelected = (patch: Partial<Candidate>) => selected && replaceCandidates(candidates.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)));
  const toggleReason = (tag: ReasonTag) => selected && updateSelected({ reasonTags: selected.reasonTags.includes(tag) ? selected.reasonTags.filter((t) => t !== tag) : [...selected.reasonTags, tag] });
  const updateChecklist = (key: keyof ReviewChecklist, value: boolean) => selected && updateSelected({ reviewChecklist: { ...selected.reviewChecklist, [key]: value } });

  const exportJson = () => {
    downloadFile(`${activeDataset.id}-jwst-candidates.json`, JSON.stringify({ projectName: 'JWST Deep Field Anomaly Atlas', datasetId: activeDataset.id, datasetDisplayName: activeDataset.displayName, imageSourceInfo: activeDataset, exportDate: new Date().toISOString(), disclaimer: 'Candidate list only. Not a confirmed astronomical discovery.', candidates }, null, 2), 'application/json');
    setLastExport(`JSON exported ${new Date().toLocaleTimeString()}`);
  };
  const esc = (v: string | number) => `"${String(v).split('"').join('""')}"`;
  const exportCsv = () => {
    const header = ['projectName', 'datasetId', 'datasetDisplayName', 'imageSourceInfo', 'exportDate', 'candidateId', 'pixelX', 'pixelY', 'raPlaceholder', 'decPlaceholder', 'grade', 'type', 'verificationStatus', 'reasonTags', 'reviewChecklist', 'notes', 'disclaimer'];
    const exportDate = new Date().toISOString();
    const disclaimer = 'Candidate list only. Not a confirmed astronomical discovery.';
    const rows = candidates.map((c) => ['JWST Deep Field Anomaly Atlas', activeDataset.id, activeDataset.displayName, `${activeDataset.fieldName}|${activeDataset.sourceType}|${activeDataset.filters}|${activeDataset.officialDataUrl}`, exportDate, c.id, c.x, c.y, c.ra, c.dec, c.grade, c.type, c.verificationStatus, c.reasonTags.join('|'), JSON.stringify(c.reviewChecklist), c.note, disclaimer]);
    downloadFile(`${activeDataset.id}-jwst-candidates.csv`, [header.join(','), ...rows.map((r) => r.map((v) => esc(v as string | number)).join(','))].join('\n'), 'text/csv');
    setLastExport(`CSV exported ${new Date().toLocaleTimeString()}`);
  };

  return (<div className="app-shell">
    <header className="topbar"><h1>JWST Deep Field Anomaly Atlas</h1><p>Public data inspection workspace for visual anomaly candidates (not a confirmed discovery).</p></header>
    <section className="status-strip">
      <span><strong>Dataset</strong><select value={activeDataset.id} onChange={(e) => { setActiveDatasetId(e.target.value); setSelectedId(null); }} className="compact"><option value="">Select</option>{DATASETS.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}</select></span>
      <span>Mode: Visual Candidate Inspection</span><span>Candidates: {candidates.length}</span><span>High priority: {highPriorityCount}</span><span>{lastExport}</span>
    </section>
    <main className="layout">
      <section className="viewer-wrap"><div className="viewer" onClick={addCandidate}><DeepFieldCanvas seed={activeDataset.seed} />{candidates.map((c) => <button key={c.id} style={{ left: `${(c.x / IMAGE_WIDTH) * 100}%`, top: `${(c.y / IMAGE_HEIGHT) * 100}%` }} className={`marker marker-${c.grade.toLowerCase()} ${c.id === selectedId ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }} />)}</div><div className="note">Candidate markers are visual annotations only. They are not confirmed astronomical discoveries. Coordinate precision is provisional until WCS/FITS support is implemented.</div></section>
      <aside className="panel"><div className="panel-header"><h2>Candidates</h2><div className="actions"><button onClick={exportJson}>Export JSON</button><button onClick={exportCsv}>Export CSV</button></div></div>
        <ul>{candidates.map((c, idx) => <li key={c.id}><button className={c.id === selectedId ? 'row selected' : 'row'} onClick={() => setSelectedId(c.id)}><span className="row-title">#{idx + 1} · {c.grade} · {c.type}</span><span className="row-sub">x:{c.x} y:{c.y} · {c.verificationStatus}</span></button></li>)}</ul>
        {selected && <div className="editor"><div className="summary-card"><div>Candidate ID: {selected.id}</div><div>Grade: {selected.grade}</div><div>Status: {selected.verificationStatus}</div><div>Pixel: {selected.x}, {selected.y}</div><div>Reason tags: {selected.reasonTags.length}</div><div>Review completion: {checklistDone}/6</div></div><h3>Edit candidate {selectedIndex + 1}</h3>
          <label>Pixel X<input value={selected.x} onChange={(e) => updateSelected({ x: Number(e.target.value) || 0 })} /></label><label>Pixel Y<input value={selected.y} onChange={(e) => updateSelected({ y: Number(e.target.value) || 0 })} /></label><label>RA placeholder<input value={selected.ra} onChange={(e) => updateSelected({ ra: e.target.value })} /></label><label>Dec placeholder<input value={selected.dec} onChange={(e) => updateSelected({ dec: e.target.value })} /></label><label>Filter / band placeholder<input value={selected.filterBand} onChange={(e) => updateSelected({ filterBand: e.target.value })} /></label><label>Grade<select value={selected.grade} onChange={(e) => updateSelected({ grade: e.target.value as Grade })}><option>A</option><option>B</option><option>C</option></select></label><label>Type<select value={selected.type} onChange={(e) => updateSelected({ type: e.target.value as CandidateType })}>{CANDIDATE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label><label>Verification status<select value={selected.verificationStatus} onChange={(e) => updateSelected({ verificationStatus: e.target.value as VerificationStatus })}>{VERIFICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <section className="workflow"><h4>Reason tags</h4><div className="tag-grid">{REASON_TAGS.map((tag) => <label key={tag}><input type="checkbox" checked={selected.reasonTags.includes(tag)} onChange={() => toggleReason(tag)} />{tag}</label>)}</div></section>
          <section className="workflow"><h4>Candidate Review Workflow</h4><label><input type="checkbox" checked={selected.reviewChecklist.visualAnomalyMarked} onChange={(e) => updateChecklist('visualAnomalyMarked', e.target.checked)} />visual anomaly marked</label><label><input type="checkbox" checked={selected.reviewChecklist.coordinatesRecorded} onChange={(e) => updateChecklist('coordinatesRecorded', e.target.checked)} />coordinates recorded</label><label><input type="checkbox" checked={selected.reviewChecklist.multiFilterComparisonNeeded} onChange={(e) => updateChecklist('multiFilterComparisonNeeded', e.target.checked)} />multi-filter comparison needed</label><label><input type="checkbox" checked={selected.reviewChecklist.catalogCrossMatchNeeded} onChange={(e) => updateChecklist('catalogCrossMatchNeeded', e.target.checked)} />catalog cross-match needed</label><label><input type="checkbox" checked={selected.reviewChecklist.literatureReviewNeeded} onChange={(e) => updateChecklist('literatureReviewNeeded', e.target.checked)} />literature review needed</label><label><input type="checkbox" checked={selected.reviewChecklist.artifactCheckNeeded} onChange={(e) => updateChecklist('artifactCheckNeeded', e.target.checked)} />artifact check needed</label></section>
          <label>Notes<textarea rows={3} value={selected.note} onChange={(e) => updateSelected({ note: e.target.value })} /></label><button className="danger" onClick={() => { replaceCandidates(candidates.filter((x) => x.id !== selected.id)); setSelectedId(null); }}>Delete candidate</button></div>}
      </aside>
    </main>
    <section className="roadmap"><button className="roadmap-toggle" onClick={() => setRoadmapOpen(!roadmapOpen)}>Real JWST Data Roadmap {roadmapOpen ? '▾' : '▸'}</button>{roadmapOpen && <ol><li>Load public image cutouts</li><li>FITS support</li><li>WCS pixel-to-sky coordinates</li><li>MAST query integration</li><li>SIMBAD/VizieR cross-match</li><li>Literature review export</li></ol>}</section>
  </div>);
}

function DeepFieldCanvas({ seed }: { seed: number }) {
  const points = createFieldPoints(seed);
  return <svg viewBox="0 0 1200 800" className="deep-field" aria-label="Procedural JWST-like deep field demo image"><defs><radialGradient id={`bgGlow-${seed}`} cx="50%" cy="40%" r="70%"><stop offset="0%" stopColor="#131a2c" /><stop offset="100%" stopColor="#05070c" /></radialGradient></defs><rect width="1200" height="800" fill={`url(#bgGlow-${seed})`} />{points.galaxies.map((g) => <ellipse key={g.id} cx={g.x} cy={g.y} rx={g.rx} ry={g.ry} fill={g.fill} opacity={g.opacity} transform={`rotate(${g.rot} ${g.x} ${g.y})`} />)}{points.redCompacts.map((s) => <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill="#d36a70" opacity={0.8} />)}{points.blueWhites.map((s) => <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill="#dce9ff" opacity={0.75} />)}{points.smudges.map((s) => <ellipse key={s.id} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill="#8f9bc2" opacity={0.18} />)}</svg>;
}

function createFieldPoints(seed: number) { let value = seed; const rand = () => { value = (value * 1664525 + 1013904223) % 4294967296; return value / 4294967296; }; return { galaxies: Array.from({ length: 320 }, (_, i) => ({ id: `g-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), rx: 0.4 + rand() * 2.4, ry: 0.4 + rand() * 1.8, rot: rand() * 180, fill: rand() > 0.65 ? '#ad7e67' : '#8ea1d7', opacity: 0.12 + rand() * 0.25 })), redCompacts: Array.from({ length: 120 }, (_, i) => ({ id: `r-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), r: 0.5 + rand() * 1.3 })), blueWhites: Array.from({ length: 140 }, (_, i) => ({ id: `b-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), r: 0.5 + rand() * 1.5 })), smudges: Array.from({ length: 18 }, (_, i) => ({ id: `s-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), rx: 10 + rand() * 26, ry: 4 + rand() * 16 })) }; }

function downloadFile(name: string, content: string, mime: string) { const url = URL.createObjectURL(new Blob([content], { type: mime })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
