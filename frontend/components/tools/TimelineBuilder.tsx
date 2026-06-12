"use client";

/* global HTMLIFrameElement */
import React, { useEffect, useRef, useState } from 'react';

/**
 * Embeds the standalone timeline editor (frontend/public/timeline) once, in
 * its full layout (figure + settings table). Theme changes are forwarded via
 * postMessage so the iframe never reloads — a reload would discard edits not
 * yet exported (the editor additionally persists to localStorage).
 */
export default function TimelineBuilder() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [src, setSrc] = useState('about:blank');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Track the app theme (the editor lives in an iframe and cannot see it).
  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    syncTheme();
    const observer = new window.MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Compute the iframe URL once — the theme is only baked in for the initial
  // load; later changes go through postMessage (no reload).
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    const marker = '/tools/timeline';
    const { pathname } = window.location;
    const markerIndex = pathname.indexOf(marker);
    const basePath = markerIndex >= 0 ? pathname.slice(0, markerIndex) : '';
    const initialTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setSrc(`${basePath}/timeline/timeline.html?panel=full&theme=${initialTheme}`);
  }, []);

  // Forward theme changes into the running editor.
  useEffect(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'timeline-theme', theme },
        window.location.origin,
      );
    } catch {
      // Iframe not ready or cross-origin sandbox (tests) — initial URL theme applies.
    }
  }, [theme]);

  return (
    <div className="timeline-builder-shell p-3 sm:p-6 lg:p-8">
      <div className="timeline-embed-card card animate-fade-in-up" style={{ padding: '0.75rem' }}>
        <iframe
          ref={iframeRef}
          title="Timeline editor"
          src={src}
          className="timeline-embed-frame block w-full"
          style={{ border: 0, background: 'transparent' }}
          sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
        />
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
        Your figure is saved in this browser automatically. Use Export for a portable copy
        (PNG, SVG, PDF, or setup JSON) and Import to load one. Drag the lower edge of the
        editor to give it more room.
      </p>
    </div>
  );
}
