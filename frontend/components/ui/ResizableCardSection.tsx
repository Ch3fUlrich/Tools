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
  bodyClassName?: string;
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
  bodyClassName = '',
  delay,
}: Props) {
  const cardRef = useRef<globalThis.HTMLDivElement>(null);
  const settingsRef = useRef<globalThis.HTMLDetailsElement>(null);
  const [size, setSize] = useState<Partial<CardSize>>(defaultSize ?? {});
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        '--card-width': size.width ? `${size.width}px` : undefined,
        position: 'relative',
      } as React.CSSProperties}
    >
      <div className="resizable-card-header">
        <h2 className="resizable-card-title text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
          <div className={`w-1 h-8 bg-gradient-to-b ${gradient} rounded-full flex-shrink-0`} aria-hidden="true" />
          {title}
        </h2>
        <details
          className="resizable-card-settings"
          ref={settingsRef}
          onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
        >
          <summary
            className="btn-icon resizable-card-settings__trigger"
            aria-label={`${title} settings`}
            title={`${title} settings`}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.3 4.3c.4-1.7 3-1.7 3.4 0 .2.9 1.2 1.4 2 1 .1 0 .3-.1.4-.2 1.5-.8 3.3 1 2.5 2.5-.5.8-.1 1.9.9 2.1 1.7.4 1.7 3 0 3.4-.9.2-1.4 1.2-1 2 .1.1.1.3.2.4.8 1.5-1 3.3-2.5 2.5-.8-.5-1.9-.1-2.1.9-.4 1.7-3 1.7-3.4 0-.2-.9-1.2-1.4-2-1-.1 0-.3.1-.4.2-1.5.8-3.3-1-2.5-2.5.5-.8.1-1.9-.9-2.1-1.7-.4-1.7-3 0-3.4.9-.2 1.4-1.2 1-2-.1-.1-.1-.3-.2-.4-.8-1.5 1-3.3 2.5-2.5.8.5 1.9.1 2.1-.9Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
            </svg>
          </summary>
          {settingsOpen && (
            <div className="popup-panel resizable-card-settings__panel animate-scale-in">
              <div className="resizable-card-settings__label">Card size</div>
              <div className="resizable-card-settings__presets" aria-label={`${title} size presets`}>
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="btn-ghost resizable-card-settings__preset px-3 py-2 text-sm"
                    onClick={() => {
                      setSize({ width: preset.width, height: preset.height });
                      setSettingsOpen(false);
                      settingsRef.current?.removeAttribute('open');
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </details>
      </div>

      <div
        className={`resizable-card__body ${bodyClassName}`}
        data-has-explicit-height={size.height ? 'true' : undefined}
        style={{
          '--card-body-height': size.height ? `${size.height}px` : undefined,
          '--card-body-min-height': `${minHeight}px`,
          '--card-body-max-height': `${maxHeight}px`,
        } as React.CSSProperties}
      >
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
