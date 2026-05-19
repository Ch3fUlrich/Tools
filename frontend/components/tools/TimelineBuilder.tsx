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
const initialTimelineSrc = '../timeline/timeline.html?panel=timeline&theme=light';
const initialSettingsSrc = '../timeline/timeline.html?panel=settings&theme=light';

export default function TimelineBuilder() {
  const [timelineSrc, setTimelineSrc] = useState(process.env.NODE_ENV === 'test' ? 'about:blank' : initialTimelineSrc);
  const [settingsSrc, setSettingsSrc] = useState(process.env.NODE_ENV === 'test' ? 'about:blank' : initialSettingsSrc);
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
    <div className="timeline-builder-shell p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ResizableCardSection
        title="Timeline"
        gradient="from-cyan-400 to-teal-500"
        presets={timelinePresets}
        defaultSize={timelineDefaultSize}
        className="timeline-figure-card mx-auto"
        bodyClassName="timeline-embed-body timeline-embed-body--figure"
        delay="100ms"
      >
        <iframe
          title="Timeline builder preview"
          src={timelineSrc}
          className="timeline-embed-frame timeline-embed-frame--figure block w-full h-full"
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
        className="timeline-settings-card mx-auto"
        bodyClassName="timeline-embed-body timeline-embed-body--settings"
        delay="200ms"
      >
        <iframe
          title="Timeline builder settings table"
          src={settingsSrc}
          className="timeline-embed-frame timeline-embed-frame--settings block w-full h-full"
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
