import { useState } from 'react';

// The opening task. Four dots; try to fence the filled ones off from the hollow
// ones with a single straight line. Three of four is the ceiling, and finding
// that out by hand is the point of the figure.
const PTS: { x: number; y: number; on: boolean }[] = [
  { x: 0, y: 0, on: false },
  { x: 0, y: 1, on: true },
  { x: 1, y: 0, on: true },
  { x: 1, y: 1, on: false },
];

const LO = -0.55;
const HI = 1.55;
const S = 320;

const sx = (x: number) => ((x - LO) / (HI - LO)) * S;
const sy = (y: number) => S - ((y - LO) / (HI - LO)) * S;

export default function SeparatorLab() {
  const [deg, setDeg] = useState(30);
  const [offset, setOffset] = useState(0.5);
  const [flip, setFlip] = useState(false);

  // Line: cos(t)·x + sin(t)·y = offset. Signed distance decides the side, so the
  // classification is exact — no pixel guessing.
  const t = (deg * Math.PI) / 180;
  const nx = Math.cos(t);
  const ny = Math.sin(t);
  const side = (p: { x: number; y: number }) => {
    const s = nx * p.x + ny * p.y - offset;
    return flip ? -s : s;
  };

  const results = PTS.map((p) => ({ ...p, pred: side(p) > 0 }));
  const correct = results.filter((r) => r.pred === r.on).length;

  // Two points far along the line, then let the SVG clip them to the box.
  const cx = nx * offset;
  const cy = ny * offset;
  const dx = -ny * 4;
  const dy = nx * 4;

  return (
    <div className="sl">
      <div className="sl-grid">
        <div className="sl-stage">
          <svg
            viewBox={`0 0 ${S} ${S}`}
            role="img"
            aria-label="Four points on a square and one straight line the reader can rotate and slide"
          >
            <defs>
              <clipPath id="sl-clip">
                <rect x="0" y="0" width={S} height={S} />
              </clipPath>
            </defs>

            <g className="sl-grid-lines">
              {[0, 1].map((v) => (
                <g key={v}>
                  <line x1={sx(v)} y1={sy(LO)} x2={sx(v)} y2={sy(HI)} />
                  <line x1={sx(LO)} y1={sy(v)} x2={sx(HI)} y2={sy(v)} />
                </g>
              ))}
            </g>

            <g clipPath="url(#sl-clip)">
              {/* the half-plane the line calls "filled" */}
              <polygon
                className="sl-half"
                points={[
                  [cx + dx, cy + dy],
                  [cx - dx, cy - dy],
                  [cx - dx + (flip ? -nx : nx) * 6, cy - dy + (flip ? -ny : ny) * 6],
                  [cx + dx + (flip ? -nx : nx) * 6, cy + dy + (flip ? -ny : ny) * 6],
                ]
                  .map(([a, b]) => `${sx(a)},${sy(b)}`)
                  .join(' ')}
              />
              <line
                className="sl-line"
                x1={sx(cx + dx)}
                y1={sy(cy + dy)}
                x2={sx(cx - dx)}
                y2={sy(cy - dy)}
              />
            </g>

            {results.map((r, i) => (
              <g key={i}>
                <circle
                  cx={sx(r.x)}
                  cy={sy(r.y)}
                  r={15}
                  className={`sl-pt ${r.on ? 'filled' : 'hollow'} ${r.pred === r.on ? 'ok' : 'wrong'}`}
                />
                {r.pred !== r.on && (
                  <text x={sx(r.x)} y={sy(r.y) + 5} className="sl-x" textAnchor="middle">
                    ×
                  </text>
                )}
                <text x={sx(r.x)} y={sy(r.y) - 22} className="sl-coord" textAnchor="middle">
                  ({r.x}, {r.y})
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="sl-side">
          <div className={`sl-score ${correct === 4 ? 'win' : ''}`}>
            <b>{correct}</b> of 4 on the right side
          </div>
          <p className="sl-hint">
            {correct <= 2
              ? 'Rotate and slide until you have three. Then look for the fourth.'
              : 'Three. Now find the position that gets the fourth one too.'}
          </p>

          <label className="sl-ctl">
            <span>
              angle <b>{deg}°</b>
            </span>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={deg}
              onChange={(e) => setDeg(parseInt(e.target.value, 10))}
            />
          </label>

          <label className="sl-ctl">
            <span>
              position <b>{offset.toFixed(2)}</b>
            </span>
            <input
              type="range"
              min={-1.2}
              max={1.6}
              step={0.01}
              value={offset}
              onChange={(e) => setOffset(parseFloat(e.target.value))}
            />
          </label>

          <button type="button" className="sl-flip" onClick={() => setFlip((f) => !f)}>
            Swap which side is filled
          </button>

          <div className="sl-key">
            <span>
              <svg width="14" height="14" aria-hidden="true">
                <circle cx="7" cy="7" r="6" className="sl-pt filled" />
              </svg>
              should be inside
            </span>
            <span>
              <svg width="14" height="14" aria-hidden="true">
                <circle cx="7" cy="7" r="6" className="sl-pt hollow" />
              </svg>
              should be outside
            </span>
          </div>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.sl { font-family: var(--font-sans); color: var(--ink-body); }
.sl-grid { display: grid; grid-template-columns: ${S}px minmax(0,1fr); gap: 20px; align-items: start; }
@media (max-width: 640px) { .sl-grid { grid-template-columns: 1fr; } .sl-stage { max-width: ${S}px; margin: 0 auto; } }
.sl-stage svg { width: 100%; height: auto; border: 1px solid var(--line-2); border-radius: var(--radius-md); background: var(--paper-2); }
.sl-grid-lines line { stroke: var(--line-2); stroke-width: 1; stroke-dasharray: 3 3; }
.sl-half { fill: var(--accent); opacity: .13; }
.sl-line { stroke: var(--accent); stroke-width: 2.5; }
.sl-pt { stroke-width: 2.5; }
.sl-pt.filled { fill: var(--ink); stroke: var(--ink); }
.sl-pt.hollow { fill: var(--paper); stroke: var(--ink); }
.sl-pt.wrong { stroke: var(--tc-red); }
.sl-x { fill: var(--tc-red); font-size: 17px; font-weight: 700; font-family: var(--font-mono); }
.sl-coord { fill: var(--ink-3); font-size: 10px; font-family: var(--font-mono); }
.sl-side { display: flex; flex-direction: column; gap: 12px; }
.sl-score { font-size: 14px; color: var(--ink-2); }
.sl-score b { font-family: var(--font-mono); font-size: 28px; color: var(--accent); vertical-align: -2px; margin-right: 4px; }
.sl-score.win b { color: var(--tc-green); }
.sl-hint { font-size: 12.5px; line-height: 1.5; color: var(--ink-3); margin: -4px 0 0; }
.sl-ctl { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--ink-2); }
.sl-ctl b { font-family: var(--font-mono); color: var(--ink); }
.sl-ctl input[type=range] { width: 100%; accent-color: var(--accent); }
.sl-flip { font: inherit; font-size: 11.5px; font-family: var(--font-mono); padding: 6px 11px; border: 1px solid var(--line-2); background: var(--paper); color: var(--ink-2); border-radius: var(--radius-sm); cursor: pointer; align-self: flex-start; }
.sl-flip:hover { border-color: var(--accent); color: var(--accent); }
.sl-key { display: flex; flex-direction: column; gap: 6px; font-size: 11.5px; color: var(--ink-3); }
.sl-key span { display: flex; align-items: center; gap: 7px; }
`;
