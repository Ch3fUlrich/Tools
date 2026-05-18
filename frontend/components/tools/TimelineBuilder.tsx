"use client";

import React, { useEffect, useState } from 'react';
import CardSection from '@/components/ui/CardSection';

export default function TimelineBuilder() {
  const [timelineSrc, setTimelineSrc] = useState('about:blank');
  const [settingsSrc, setSettingsSrc] = useState('about:blank');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    syncTheme();
    const observer = new window.MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const marker = '/tools/timeline';
    const { pathname } = window.location;
    const markerIndex = pathname.indexOf(marker);
    const basePath = markerIndex >= 0 ? pathname.slice(0, markerIndex) : '';
    const timelinePath = `${basePath}/timeline/timeline.html`;
    setTimelineSrc(`${timelinePath}?panel=timeline&theme=${theme}`);
    setSettingsSrc(`${timelinePath}?panel=settings&theme=${theme}`);
  }, [theme]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <CardSection title="Timeline" gradient="from-cyan-400 to-teal-500" delay="100ms">
        <iframe
          title="Timeline builder preview"
          src={timelineSrc}
          className="block w-full"
          style={{
            minHeight: 'min(760px, calc(100vh - 12rem))',
            border: 0,
            background: 'transparent',
          }}
          sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
        />
      </CardSection>

      <CardSection
        title="Timeline Settings Table"
        gradient="from-cyan-400 to-teal-500"
        delay="200ms"
      >
        <iframe
          title="Timeline builder settings table"
          src={settingsSrc}
          className="block w-full"
          style={{
            minHeight: '620px',
            border: 0,
            background: 'transparent',
          }}
          sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
        />
      </CardSection>
    </div>
  );
}
