/** A schematic inference step, synchronized to the hero's scene clock. */
export default function SystemsFlow({ t }: { t: number }) {
  const time = Math.min(t, 5.6);
  const stage = time < 1.3 ? 0 : time < 2.5 ? 1 : time < 4.3 ? 2 : 3;
  const layers = [
    { y: 26, name: 'Model', action: 'Define operations' },
    { y: 116, name: 'Runtime', action: 'Schedule kernels' },
    { y: 206, name: 'GPU', action: 'Execute in parallel' },
  ];
  const packetY =
    time < 1.3
      ? 136
      : time < 2.5
        ? 136 + Math.min(1, (time - 1.3) / 0.4) * 90
        : time < 4.3
          ? 226 + Math.min(1, (time - 2.5) / 0.4) * 90
          : 316 + Math.min(1, (time - 4.3) / 0.4) * 63;
  const mono = 'var(--font-mono)';
  return (
    <svg viewBox="0 0 460 440" width="100%" height="100%" aria-hidden="true">
      <path d="M160 136V379" fill="none" stroke="var(--line-2)" strokeDasharray="3 5" />
      {[2, 1, 0].map((layerIndex) => {
        const layer = layers[layerIndex];
        const reached = stage >= layerIndex;
        const selected = stage === layerIndex;
        return (
          <g key={layer.name}>
            <g transform={`matrix(1 .5 -1 .5 160 ${layer.y})`}>
              <rect
                width="140"
                height="140"
                fill="var(--paper)"
                stroke={selected ? 'var(--accent)' : 'var(--line-2)'}
                strokeOpacity={selected ? 0.6 : 1}
              />
              {Array.from({ length: 6 }, (_, i) => (
                <path
                  key={i}
                  d={`M${(i + 1) * 20} 0V140M0 ${(i + 1) * 20}H140`}
                  stroke="var(--line)"
                  strokeWidth=".6"
                  fill="none"
                />
              ))}
              {layerIndex === 0 && (
                <>
                  <path
                    d="M22 22 70 70 118 118"
                    fill="none"
                    stroke={reached ? 'var(--accent)' : 'var(--line-2)'}
                    strokeWidth="2"
                  />
                  {[8, 56, 104].map((p, i) => (
                    <g key={p}>
                      <rect
                        x={p}
                        y={p}
                        width="28"
                        height="28"
                        rx="3"
                        fill={time >= i * 0.35 ? 'var(--accent)' : 'var(--paper-2)'}
                        opacity={time >= i * 0.35 ? 0.85 : 1}
                      />
                      <path
                        d={`M${p + 7} ${p + 14}h14M${p + 14} ${p + 7}v14`}
                        stroke={time >= i * 0.35 ? 'var(--paper)' : 'var(--ink-3)'}
                        strokeWidth="1.4"
                      />
                    </g>
                  ))}
                </>
              )}
              {layerIndex === 1 &&
                Array.from({ length: 6 }, (_, i) => {
                  const scheduled = time >= 1.4 + i * 0.13;
                  return (
                    <rect
                      key={i}
                      x="23"
                      y={19 + i * 17}
                      width={i % 2 ? 76 : 94}
                      height="11"
                      rx="2"
                      fill={scheduled ? 'var(--accent)' : 'var(--paper-2)'}
                      stroke={scheduled ? 'var(--accent)' : 'var(--line-2)'}
                      opacity={scheduled ? 0.4 + i * 0.09 : 1}
                    />
                  );
                })}
              {layerIndex === 2 &&
                Array.from({ length: 36 }, (_, i) => {
                  const row = Math.floor(i / 6),
                    col = i % 6;
                  const running = time >= 2.8 + (row + col) * 0.1;
                  return (
                    <rect
                      key={i}
                      x={12 + col * 20}
                      y={12 + row * 20}
                      width="16"
                      height="16"
                      rx="1"
                      fill={running ? 'var(--accent)' : 'var(--paper-2)'}
                      stroke={running ? 'none' : 'var(--line)'}
                      opacity={running ? 0.35 + ((row + col) % 3) * 0.22 : 1}
                    />
                  );
                })}
            </g>
            <path
              d={`M308 ${layer.y + 70}h12`}
              stroke={selected ? 'var(--accent)' : 'var(--line-2)'}
            />
            <text
              x="330"
              y={layer.y + 68}
              fontFamily="var(--font-read)"
              fontSize="17"
              fill={selected ? 'var(--accent)' : 'var(--ink-2)'}
            >
              {layer.name}
            </text>
            <text
              x="330"
              y={layer.y + 84}
              fontFamily="var(--font-sans)"
              fontSize="10"
              fill="var(--ink-3)"
            >
              {layer.action}
            </text>
          </g>
        );
      })}
      <path
        d={`M160 136V${packetY}`}
        stroke="var(--accent)"
        strokeWidth="1.5"
        opacity=".65"
        fill="none"
      />
      <circle cx="160" cy={packetY} r="4" fill="var(--accent)" />
      <g opacity={stage === 3 ? 1 : 0.35}>
        <rect
          x="105"
          y="379"
          width="110"
          height="32"
          rx="6"
          fill={stage === 3 ? 'var(--accent-soft)' : 'var(--paper)'}
          stroke={stage === 3 ? 'var(--accent)' : 'var(--line-2)'}
        />
        <text
          x="160"
          y="399"
          textAnchor="middle"
          fontFamily={mono}
          fontSize="11"
          fill={stage === 3 ? 'var(--accent)' : 'var(--ink-3)'}
        >
          {stage === 3 ? 'Next token ✓' : 'Next token'}
        </text>
      </g>
    </svg>
  );
}
