"use client";

import React, { useEffect, useState } from 'react';

export default function TimelineBuilder() {
  const [iframeSrc, setIframeSrc] = useState('about:blank');

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const marker = '/tools/timeline';
    const { pathname } = window.location;
    const markerIndex = pathname.indexOf(marker);
    const basePath = markerIndex >= 0 ? pathname.slice(0, markerIndex) : '';
    setIframeSrc(`${basePath}/timeline/timeline.html`);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div
        className="overflow-hidden"
        style={{
          border: '1px solid var(--card-border)',
          borderRadius: '1rem',
          background: 'var(--bg-secondary)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <iframe
          title="Timeline builder editor"
          src={iframeSrc}
          className="block w-full"
          style={{
            minHeight: 'min(1180px, calc(100vh - 9rem))',
            border: 0,
            background: 'var(--bg-secondary)',
          }}
          sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
