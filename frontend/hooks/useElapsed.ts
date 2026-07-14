/* global setInterval, clearInterval */
import { useState, useEffect } from 'react';

export function useElapsed(startedAt: string | null): string {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!startedAt) { setElapsed(''); return; }
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}
