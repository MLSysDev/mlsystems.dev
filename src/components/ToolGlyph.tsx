export default function ToolGlyph({ id }: { id: string }) {
  const size = 56;
  switch (id) {
    case 'attention-viz':
      return (
        <svg width={size} height={size} viewBox="0 0 56 56">
          {[0, 1, 2, 3].map((i) =>
            [0, 1, 2, 3].map((j) => (
              <rect
                key={`${i}-${j}`}
                x={4 + j * 12}
                y={4 + i * 12}
                width="10"
                height="10"
                fill="var(--accent)"
                opacity={0.15 + Math.exp(-Math.abs(i - j)) * 0.6}
                rx="1"
              />
            )),
          )}
        </svg>
      );
    case 'throughput-calc':
      return (
        <svg width={size} height={size} viewBox="0 0 56 56">
          <rect x="4" y="40" width="12" height="12" fill="var(--ink-3)" />
          <rect x="20" y="28" width="12" height="24" fill="var(--ink-2)" />
          <rect x="36" y="14" width="12" height="38" fill="var(--accent)" />
        </svg>
      );
    case 'gpu-mem-calc':
      return (
        <svg width={size} height={size} viewBox="0 0 56 56">
          <rect
            x="16"
            y="4"
            width="24"
            height="48"
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="1.5"
            rx="2"
          />
          <rect x="20" y="8" width="16" height="14" fill="var(--accent)" rx="1" />
          <rect x="20" y="25" width="16" height="9" fill="var(--ink-2)" rx="1" />
          <rect x="20" y="37" width="16" height="6" fill="var(--ink-3)" rx="1" />
          <rect x="20" y="46" width="16" height="3" fill="var(--ink-3)" opacity="0.5" rx="1" />
        </svg>
      );
    case 'model-card':
      return (
        <svg width={size} height={size} viewBox="0 0 56 56">
          <rect
            x="6"
            y="8"
            width="44"
            height="40"
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="1.5"
            rx="2"
          />
          <line x1="12" y1="18" x2="38" y2="18" stroke="var(--ink-2)" strokeWidth="2" />
          <line x1="12" y1="26" x2="44" y2="26" stroke="var(--ink-3)" strokeWidth="1" />
          <line x1="12" y1="32" x2="40" y2="32" stroke="var(--ink-3)" strokeWidth="1" />
          <line x1="12" y1="38" x2="34" y2="38" stroke="var(--ink-3)" strokeWidth="1" />
        </svg>
      );
    case 'eval-harness':
      return (
        <svg width={size} height={size} viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="18" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" />
          <path
            d="M 18 30 L 26 38 L 40 22"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'kernel-bench':
      return (
        <svg width={size} height={size} viewBox="0 0 56 56">
          <text
            x="28"
            y="36"
            fontSize="24"
            fontFamily="var(--font-mono)"
            fill="var(--ink-2)"
            textAnchor="middle"
            fontWeight="500"
          >
            ⌘∑
          </text>
        </svg>
      );
    default:
      return null;
  }
}
