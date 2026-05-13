import { useMemo, useState } from 'react';

type Grade = 'A' | 'B' | 'C';
type CandidateType = 'Little Red Dot-like' | 'Red compact source' | 'Possible artifact' | 'Possible lensing feature' | 'Other';
type VerificationStatus = 'Unchecked' | 'Needs catalog cross-match' | 'Possible known source' | 'Possible artifact' | 'High-priority candidate';
type SourceType = 'demo' | 'public-image' | 'fits-coming-soon';
type DataIntegrityBadge = 'Verified JWST Data' | 'Processed Science Image' | 'Decorative Background';
type DataClassification = 'REAL_JWST_DATA' | 'PROCESSED_SCIENCE_IMAGE' | 'DECORATIVE_VISUAL';

interface Dataset { id: string; displayName: string; sourceType: SourceType; filters: string; officialDataUrl: string; seed: number; badge: DataIntegrityBadge; classification: DataClassification; visualLabel: string; }
interface Candidate { id: string; x: number; y: number; datasetId: string; datasetName: string; filterBand: string; grade: Grade; type: CandidateType; verificationStatus: VerificationStatus; note: string; timestamp: string; }
interface ObservationCard { id: string; title: string; imageUrl: string; targetName: string; source: string; instrument: string; filters: string; programId: string; observationPurpose: string; archive: string; credit: string; colorMapping: string; badge: Exclude<DataIntegrityBadge, 'Decorative Background'>; classification: Exclude<DataClassification, 'DECORATIVE_VISUAL'>; }

const STORAGE_KEY = 'jwst-anomaly-atlas-v4';
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 800;

const DATASETS: Dataset[] = [
  { id: 'demo-deep-field', displayName: 'Procedural Deep Field Demo', sourceType: 'demo', filters: 'Synthetic placeholders', officialDataUrl: 'N/A', seed: 42, badge: 'Decorative Background', classification: 'DECORATIVE_VISUAL', visualLabel: 'Visual background only · Not observation data' },
  { id: 'jades-demo', displayName: 'JADES Placeholder Panel', sourceType: 'public-image', filters: 'Placeholder', officialDataUrl: 'https://example.org/jades', seed: 77, badge: 'Decorative Background', classification: 'DECORATIVE_VISUAL', visualLabel: 'Concept visual · Not observation data' },
  { id: 'ceers-demo', displayName: 'CEERS Placeholder Panel', sourceType: 'public-image', filters: 'Placeholder', officialDataUrl: 'https://example.org/ceers', seed: 108, badge: 'Decorative Background', classification: 'DECORATIVE_VISUAL', visualLabel: 'Concept visual · Not observation data' },
];

const OBSERVATION_CARDS: ObservationCard[] = [
  {
    id: 'smacs-0723',
    title: 'SMACS 0723 Deep Field',
    imageUrl: 'https://stsci-opo.org/STScI-01G7R8M0C0YJ4J0R4A4P4H7GJX.png',
    targetName: 'SMACS J0723.3-7327',
    source: 'NASA/ESA/CSA/STScI first release observations',
    instrument: 'NIRCam + MIRI',
    filters: 'NIRCam: F090W, F150W, F200W, F277W, F356W, F444W; MIRI: F770W',
    programId: 'Program ID 2736',
    observationPurpose: 'Massive galaxy cluster lensing + deep background galaxies',
    archive: 'MAST / STScI public release products',
    credit: 'NASA, ESA, CSA, STScI',
    colorMapping: 'Longer infrared wavelengths mapped to redder visible colors for interpretation.',
    badge: 'Processed Science Image',
    classification: 'PROCESSED_SCIENCE_IMAGE',
  },
  {
    id: 'carina',
    title: 'Carina Nebula Cliffs',
    imageUrl: 'https://stsci-opo.org/STScI-01G7RA6B6M8N6N4WQ4J7S2TW8K.png',
    targetName: 'NGC 3324 (Carina Nebula)',
    source: 'NASA/ESA/CSA/STScI public image',
    instrument: 'NIRCam',
    filters: 'F090W, F187N, F200W, F335M, F444W',
    programId: 'Program ID 2731',
    observationPurpose: 'Star formation front and sculpted gas/dust structures',
    archive: 'MAST / STScI public release products',
    credit: 'NASA, ESA, CSA, STScI',
    colorMapping: 'Narrow/medium/wide infrared bands mapped to visible palette to reveal gas and dust contrast.',
    badge: 'Processed Science Image',
    classification: 'PROCESSED_SCIENCE_IMAGE',
  },
  {
    id: 'stephans',
    title: "Stephan's Quintet",
    imageUrl: 'https://stsci-opo.org/STScI-01G8H7HSPW1NQ1P0AFV8R3K3W7.png',
    targetName: "Stephan's Quintet",
    source: 'NASA/ESA/CSA/STScI public release',
    instrument: 'NIRCam + MIRI',
    filters: 'NIRCam: F090W, F150W, F200W; MIRI: F770W, F1000W, F1130W, F1500W',
    programId: 'Program ID 2732',
    observationPurpose: 'Galaxy interaction, shock front, and star formation diagnostics',
    archive: 'MAST / STScI public release products',
    credit: 'NASA, ESA, CSA, STScI',
    colorMapping: 'Different infrared filters are mapped into RGB channels; this is interpretive, not natural color.',
    badge: 'Verified JWST Data',
    classification: 'REAL_JWST_DATA',
  },
];

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
  const activeDataset = DATASETS.find((d) => d.id === activeDatasetId) ?? DATASETS[0];
  const candidates = byDataset[activeDataset.id] ?? [];
  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const selectedIndex = useMemo(() => candidates.findIndex((c) => c.id === selectedId), [candidates, selectedId]);

  const replaceCandidates = (next: Candidate[]) => setByDataset({ ...byDataset, [activeDataset.id]: next });
  const addCandidate = (event: React.MouseEvent<HTMLDivElement>) => {
    const svg = event.currentTarget.querySelector('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * IMAGE_WIDTH);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * IMAGE_HEIGHT);
    const id = `cand-${crypto.randomUUID().slice(0, 8)}`;
    const candidate: Candidate = { id, x: Math.max(0, Math.min(IMAGE_WIDTH, x)), y: Math.max(0, Math.min(IMAGE_HEIGHT, y)), datasetId: activeDataset.id, datasetName: activeDataset.displayName, filterBand: activeDataset.filters, grade: 'B', type: 'Little Red Dot-like', verificationStatus: 'Unchecked', note: '', timestamp: new Date().toISOString() };
    replaceCandidates([candidate, ...candidates]);
    setSelectedId(id);
  };

  return <div className="app-shell">
    <header className="topbar">
      <h1>JWST Visual Integrity Workspace</h1>
      <p>Every visual is classified as real data, processed science image, or decorative visual.</p>
    </header>
    <section className="status-strip">
      <span><strong>Dataset</strong><select value={activeDataset.id} onChange={(e) => { setActiveDatasetId(e.target.value); setSelectedId(null); }} className="compact">{DATASETS.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}</select></span>
      <span>Data Integrity Badge: <strong>{activeDataset.badge}</strong></span>
      <span>Classification: <strong>{activeDataset.classification}</strong></span>
      <span className="warning-chip">{activeDataset.visualLabel}</span>
    </section>

    <main className="layout">
      <section className="viewer-wrap">
        <div className="viewer" onClick={addCandidate}>
          <DeepFieldCanvas seed={activeDataset.seed} />
          <div className="viewer-label">Visual background only · Not observation data</div>
          {candidates.map((c) => <button key={c.id} style={{ left: `${(c.x / IMAGE_WIDTH) * 100}%`, top: `${(c.y / IMAGE_HEIGHT) * 100}%` }} className={`marker marker-${c.grade.toLowerCase()} ${c.id === selectedId ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }} />)}
        </div>
        <div className="note">This starfield/canvas scene is generated for UI workflow testing, not from JWST/MAST observation products.</div>
      </section>

      <aside className="panel">
        <h2>Data Integrity Badge Legend</h2>
        <ul>
          <li><strong>Verified JWST Data</strong> → REAL_JWST_DATA</li>
          <li><strong>Processed Science Image</strong> → PROCESSED_SCIENCE_IMAGE</li>
          <li><strong>Decorative Background</strong> → DECORATIVE_VISUAL</li>
        </ul>
        {selected && <div className="editor"><h3>Candidate #{selectedIndex + 1}</h3><div>{selected.type}</div><div>{selected.verificationStatus}</div></div>}
      </aside>
    </main>

    <section className="cards">
      <h2>JWST Sample Observation Cards</h2>
      <p className="note">This is infrared data mapped into visible color.</p>
      <div className="card-grid">
        {OBSERVATION_CARDS.map((card) => (
          <article key={card.id} className="obs-card">
            <img src={card.imageUrl} alt={card.title} loading="lazy" />
            <div className="badge">{card.badge}</div>
            <h3>{card.title}</h3>
            <p className="class">{card.classification}</p>
            <dl>
              <dt>Target name</dt><dd>{card.targetName}</dd>
              <dt>Source</dt><dd>{card.source}</dd>
              <dt>Instrument</dt><dd>{card.instrument}</dd>
              <dt>Filters</dt><dd>{card.filters}</dd>
              <dt>Program ID</dt><dd>{card.programId}</dd>
              <dt>Data archive</dt><dd>{card.archive}</dd>
              <dt>Credit</dt><dd>{card.credit}</dd>
              <dt>Observation purpose</dt><dd>{card.observationPurpose}</dd>
              <dt>Color mapping explanation</dt><dd>{card.colorMapping}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  </div>;
}

function DeepFieldCanvas({ seed }: { seed: number }) {
  const points = createFieldPoints(seed);
  return <svg viewBox="0 0 1200 800" className="deep-field" aria-label="Procedural deep field demo (decorative only)"><defs><radialGradient id={`bgGlow-${seed}`} cx="50%" cy="40%" r="70%"><stop offset="0%" stopColor="#131a2c" /><stop offset="100%" stopColor="#05070c" /></radialGradient></defs><rect width="1200" height="800" fill={`url(#bgGlow-${seed})`} />{points.galaxies.map((g) => <ellipse key={g.id} cx={g.x} cy={g.y} rx={g.rx} ry={g.ry} fill={g.fill} opacity={g.opacity} transform={`rotate(${g.rot} ${g.x} ${g.y})`} />)}{points.stars.map((s) => <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill={s.fill} opacity={s.opacity} />)}</svg>;
}

function createFieldPoints(seed: number) { let value = seed; const rand = () => { value = (value * 1664525 + 1013904223) % 4294967296; return value / 4294967296; }; return { galaxies: Array.from({ length: 260 }, (_, i) => ({ id: `g-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), rx: 0.4 + rand() * 2.4, ry: 0.4 + rand() * 1.8, rot: rand() * 180, fill: rand() > 0.65 ? '#ad7e67' : '#8ea1d7', opacity: 0.12 + rand() * 0.25 })), stars: Array.from({ length: 300 }, (_, i) => ({ id: `s-${i}`, x: Math.round(rand() * 1200), y: Math.round(rand() * 800), r: 0.5 + rand() * 1.5, fill: rand() > 0.6 ? '#dce9ff' : '#d36a70', opacity: 0.6 + rand() * 0.25 })) }; }
