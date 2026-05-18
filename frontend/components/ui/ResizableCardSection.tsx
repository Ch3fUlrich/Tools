"use client";

import React, { useCallback, useRef, useState } from 'react';

type CardSize = {
  width: number;
  height: number;
};

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type CardSizePreset = Partial<CardSize> & {
  label: string;
};

interface Props {
  title: string;
  gradient: string;
  children: React.ReactNode;
  presets: CardSizePreset[];
  defaultSize?: CardSize;
  minWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  delay?: string;
}

export default function ResizableCardSection({
  title,
  gradient,
  children,
  presets,
  defaultSize,
  minWidth = 420,
  minHeight = 360,
  maxHeight = 2600,
  className = '',
  delay,
}: Props) {
  const cardRef = useRef<globalThis.HTMLDivElement>(null);
  const [size, setSize] = useState<Partial<CardSize>>(defaultSize ?? {});

  const startResize = useCallback((edge: ResizeEdge, event: React.PointerEvent) => {
    event.preventDefault();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = cardRef.current?.getBoundingClientRect();
    const startSize = {
      width: size.width ?? rect?.width ?? minWidth,
      height: size.height ?? rect?.height ?? minHeight,
    };
    const target = event.currentTarget;

    target.setPointerCapture(pointerId);

    const onPointerMove = (moveEvent: globalThis.Event) => {
      const pointerEvent = moveEvent as globalThis.PointerEvent;
      const deltaX = pointerEvent.clientX - startX;
      const deltaY = pointerEvent.clientY - startY;
      const nextWidth = edge.includes('e')
        ? startSize.width + deltaX
        : edge.includes('w')
          ? startSize.width - deltaX
          : startSize.width;
      const nextHeight = edge.includes('s')
        ? startSize.height + deltaY
        : edge.includes('n')
          ? startSize.height - deltaY
          : startSize.height;

      setSize((current) => ({
        ...current,
        width: Math.max(minWidth, nextWidth),
        height: Math.min(maxHeight, Math.max(minHeight, nextHeight)),
      }));
    };

    const onPointerUp = () => {
      target.releasePointerCapture(pointerId);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
  }, [maxHeight, minHeight, minWidth, size]);

  return (
    <div
      ref={cardRef}
      data-has-explicit-size={size.width ? 'true' : undefined}
      className={`card resizable-card animate-fade-in-up ${className}`}
      style={{
        animationDelay: delay,
        width: size.width ? `${size.width}px` : undefined,
        maxWidth: size.width ? 'none' : '100%',
        position: 'relative',
      }}
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
        <div className={`w-1 h-8 bg-gradient-to-b ${gradient} rounded-full flex-shrink-0`} aria-hidden="true" />
        {title}
      </h2>
      <div className="mb-6 flex flex-wrap gap-2" aria-label={`${title} size presets`}>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="btn-ghost px-3 py-2 text-sm"
            onClick={() => setSize({ width: preset.width, height: preset.height })}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div style={size.height ? { height: `${size.height}px`, minHeight, overflow: 'auto' } : undefined}>
        {children}
      </div>

      <button type="button" aria-label={`Resize ${title} top edge`} className="resize-handle resize-handle-n" onPointerDown={(event) => startResize('n', event)} />
      <button type="button" aria-label={`Resize ${title} right edge`} className="resize-handle resize-handle-e" onPointerDown={(event) => startResize('e', event)} />
      <button type="button" aria-label={`Resize ${title} bottom edge`} className="resize-handle resize-handle-s" onPointerDown={(event) => startResize('s', event)} />
      <button type="button" aria-label={`Resize ${title} left edge`} className="resize-handle resize-handle-w" onPointerDown={(event) => startResize('w', event)} />
      <button type="button" aria-label={`Resize ${title} top right corner`} className="resize-handle resize-handle-ne" onPointerDown={(event) => startResize('ne', event)} />
      <button type="button" aria-label={`Resize ${title} top left corner`} className="resize-handle resize-handle-nw" onPointerDown={(event) => startResize('nw', event)} />
      <button type="button" aria-label={`Resize ${title} bottom right corner`} className="resize-handle resize-handle-se" onPointerDown={(event) => startResize('se', event)} />
      <button type="button" aria-label={`Resize ${title} bottom left corner`} className="resize-handle resize-handle-sw" onPointerDown={(event) => startResize('sw', event)} />
    </div>
  );
}
