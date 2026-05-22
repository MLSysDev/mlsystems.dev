'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = 'mlsystems-analytics-consent';

type Consent = 'accepted' | 'declined';

function updateConsent(granted: boolean) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

export default function AnalyticsConsent({ measurementId }: { measurementId?: string }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
      setConsent(stored === 'accepted' || stored === 'declined' ? stored : null);
    } catch {}
    setMounted(true);
  }, []);

  function choose(next: Consent) {
    setConsent(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    updateConsent(next === 'accepted');
  }

  if (!mounted || !measurementId || consent) return null;

  return (
    <aside className="analytics-consent" aria-label="Analytics consent">
      <button
        type="button"
        className="analytics-consent-close"
        aria-label="Dismiss analytics prompt"
        onClick={() => choose('declined')}
      >
        x
      </button>
      <div>
        <div className="analytics-consent-title">Privacy preferences</div>
        <p>We use optional analytics to understand readership and improve the site.</p>
      </div>
      <div className="analytics-consent-actions">
        <button type="button" className="btn btn-primary" onClick={() => choose('accepted')}>
          Accept
        </button>
        <button type="button" className="btn" onClick={() => choose('declined')}>
          Decline
        </button>
      </div>
    </aside>
  );
}
