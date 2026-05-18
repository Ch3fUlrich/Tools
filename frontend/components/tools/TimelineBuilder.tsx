"use client";

import React, { useEffect, useState } from 'react';
import ResizableCardSection, { type CardSizePreset } from '@/components/ui/ResizableCardSection';

const timelinePresets: CardSizePreset[] = [
  { label: 'Compact', width: 960, height: 620 },
  { label: 'Default', width: 1280, height: 760 },
  { label: 'Expanded', width: 1600, height: 1000 },
];

const timelineDefaultSize = { width: 1280, height: 760 };

const settingsPresets: CardSizePreset[] = [
  { label: 'Compact', width: 960, height: 900 },
  { label: 'Default', width: 1280, height: 1860 },
  { label: 'Expanded', width: 1600, height: 2400 },
];

const settingsDefaultSize = { width: 1280, height: 1860 };

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
      <ResizableCardSection
        title="Timeline"
        gradient="from-cyan-400 to-teal-500"
        presets={timelinePresets}
        defaultSize={timelineDefaultSize}
        className="mx-auto"
        delay="100ms"
      >
        <iframe
          title="Timeline builder preview"
          src={timelineSrc}
          className="block w-full h-full"
          style={{
            border: 0,
            background: 'transparent',
          }}
          sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
        />
      </ResizableCardSection>

      <ResizableCardSection
        title="Timeline Settings Table"
        gradient="from-cyan-400 to-teal-500"
        presets={settingsPresets}
        defaultSize={settingsDefaultSize}
        maxHeight={3200}
        className="mx-auto"
        delay="200ms"
      >
        <iframe
          title="Timeline builder settings table"
          src={settingsSrc}
          className="block w-full h-full"
          style={{
            border: 0,
            background: 'transparent',
          }}
          sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
        />
      </ResizableCardSection>
    </div>
  );
}
