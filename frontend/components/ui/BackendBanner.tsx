"use client";

import { useState, useEffect } from 'react';
import { useBackendStatus, checkBackend } from '@/lib/api/backendStatus';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function BackendBanner() {
  const status = useBackendStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void checkBackend();

    // Re-probe when the tab regains focus or the network comes back, so the
    // banner clears (and tools switch back to the backend) without a reload.
    const recheck = () => void checkBackend(true);
    window.addEventListener('online', recheck);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkBackend();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', recheck);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (status !== 'offline' || dismissed) return null;

  return (
    <div style={{background:'rgba(251,191,36,0.08)', borderBottom:'1px solid rgba(245,158,11,0.3)', padding:'0.375rem 1rem'}}>
      <div style={{maxWidth:'80rem', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.8125rem', color:'var(--warning)', minWidth:0}}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{width:14,height:14,minWidth:14,flexShrink:0}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span style={{overflow:'hidden'}}>
            <strong>No backend connected.</strong>
            {' '}
            <span style={{opacity:0.85}}>
              {API_BASE_URL === ''
                ? 'Calculations run locally in your browser; accounts and history are unavailable.'
                : 'Calculations run locally in your browser until the backend is reachable again.'}
            </span>
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{background:'none', border:'none', cursor:'pointer', padding:'0.25rem', color:'var(--warning)', flexShrink:0, opacity:0.8}}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:14,height:14}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
