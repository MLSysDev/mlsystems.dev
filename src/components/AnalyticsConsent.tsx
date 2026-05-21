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

function loadGoogleAnalytics(measurementId: string) {
  if (!measurementId || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export default function AnalyticsConsent({ measurementId }: { measurementId?: string }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
      setConsent(stored === 'accepted' || stored === 'declined' ? stored : null);
      if (stored === 'accepted' && measurementId) loadGoogleAnalytics(measurementId);
    } catch {}
    setMounted(true);
  }, [measurementId]);

  function choose(next: Consent) {
    setConsent(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    if (next === 'accepted' && measurementId) loadGoogleAnalytics(measurementId);
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
        <div className="analytics-consent-title">Optional analytics</div>
        <p>
          We use Google Analytics for richer usage patterns beyond basic traffic counts. It is
          optional and helps guide what we improve.
        </p>
      </div>
      <div className="analytics-consent-actions">
        <button type="button" className="btn btn-primary" onClick={() => choose('accepted')}>
          Allow
        </button>
        <button type="button" className="btn" onClick={() => choose('declined')}>
          Decline
        </button>
      </div>
    </aside>
  );
}
