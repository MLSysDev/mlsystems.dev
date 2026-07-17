const S =
  '<svg class="concept-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">';

export interface ConceptIcon {
  key: string;
  label: string;
  svg: string;
}

export const CONCEPT_ICONS: ConceptIcon[] = [
  {
    key: 'kernel',
    label: 'Kernel',
    svg: `${S}<rect x="7" y="7" width="10" height="10" rx="1"/><rect x="10.5" y="10.5" width="3" height="3"/><path d="M9.5 7V4M14.5 7V4M9.5 20v-3M14.5 20v-3M4 9.5h3M4 14.5h3M17 9.5h3M17 14.5h3"/></svg>`,
  },
  {
    key: 'attention',
    label: 'Attention',
    svg: `${S}<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/><rect x="4.6" y="4.6" width="4.1" height="4.1" fill="currentColor" stroke="none"/><rect x="9.95" y="9.95" width="4.1" height="4.1" fill="currentColor" stroke="none"/><rect x="15.3" y="15.3" width="4.1" height="4.1" fill="currentColor" stroke="none"/></svg>`,
  },
  {
    key: 'cluster',
    label: 'Cluster',
    svg: `${S}<circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="7" r="2.2"/><circle cx="12" cy="17" r="2.2"/><path d="M8 8.2l3.2 6.6M16 8.2l-3.2 6.6M8.2 7h7.6"/></svg>`,
  },
  {
    key: 'tokenize',
    label: 'Tokenize',
    svg: `${S}<rect x="3" y="9" width="4.2" height="6" rx="1"/><rect x="9.9" y="9" width="4.2" height="6" rx="1"/><rect x="16.8" y="9" width="4.2" height="6" rx="1"/></svg>`,
  },
  {
    key: 'train',
    label: 'Train',
    svg: `${S}<path d="M4 4v16h16"/><path d="M6 7c5 1.5 4.5 9.5 13 10"/></svg>`,
  },
  {
    key: 'serve',
    label: 'Serve',
    svg: `${S}<rect x="3" y="8" width="6" height="8" rx="1"/><rect x="15" y="8" width="6" height="8" rx="1"/><path d="M9 12h5.4"/><path d="M12.6 10.2 14.7 12l-2.1 1.8"/></svg>`,
  },
  {
    key: 'scale',
    label: 'Scale',
    svg: `${S}<path d="M12 3 21 7 12 11 3 7Z"/><path d="M3 12 12 16 21 12"/><path d="M3 16.5 12 20.5 21 16.5"/></svg>`,
  },
  {
    key: 'vram',
    label: 'VRAM',
    svg: `${S}<rect x="6" y="4" width="12" height="16" rx="1"/><path d="M6 8h12M6 12h12M6 16h12"/><path d="M9 4V2.5M15 4V2.5M9 21.5V20M15 21.5V20"/></svg>`,
  },
  {
    key: 'quantize',
    label: 'Quantize',
    svg: `${S}<rect x="4" y="5" width="3.2" height="15" rx="0.6"/><rect x="10.4" y="9" width="3.2" height="11" rx="0.6"/><rect x="16.8" y="13" width="3.2" height="7" rx="0.6"/></svg>`,
  },
  {
    key: 'batch',
    label: 'Batch',
    svg: `${S}<rect x="3" y="6" width="15" height="3" rx="1.5"/><rect x="3" y="11" width="18" height="3" rx="1.5"/><rect x="3" y="16" width="11" height="3" rx="1.5"/></svg>`,
  },
  {
    key: 'network',
    label: 'Network',
    svg: `${S}<circle cx="6" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="18" cy="9" r="1.6"/><circle cx="18" cy="15" r="1.6"/><path d="M7.5 6.5 16.5 8.7M7.5 11.6 16.5 9.4M7.5 12.5 16.5 14.4M7.5 17.4 16.5 15.4"/></svg>`,
  },
  {
    key: 'embedding',
    label: 'Embedding',
    svg: `${S}<path d="M5 3v16h16"/><path d="M5 19 12 12"/><path d="M9.4 12H12v2.6"/><circle cx="16" cy="7" r="1.1"/><circle cx="18" cy="13" r="1.1"/><circle cx="13.6" cy="9.6" r="1.1"/></svg>`,
  },
  {
    key: 'gradient',
    label: 'Gradient descent',
    svg: `${S}<path d="M4 5Q12 21 20 5"/><circle cx="8.4" cy="11.5" r="1.6" fill="currentColor" stroke="none"/></svg>`,
  },
  {
    key: 'checkpoint',
    label: 'Checkpoint',
    svg: `${S}<path d="M5 5h11l3 3v11H5Z"/><path d="M8 5v4h6V5"/><rect x="8.5" y="13" width="7" height="4"/></svg>`,
  },
  {
    key: 'cache',
    label: 'Cache',
    svg: `${S}<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12.5 7 9 13h2.6l-1 4 4.4-6.4H12l0.5-3.6Z" fill="currentColor" stroke="none"/></svg>`,
  },
  {
    key: 'latency',
    label: 'Latency',
    svg: `${S}<path d="M4 17a8 8 0 0 1 16 0"/><path d="M12 17 15.5 11.5"/><circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"/><path d="M4 17H2.6M21.4 17H20M12 9V7.6"/></svg>`,
  },
];
