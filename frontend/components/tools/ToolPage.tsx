import React from 'react';

type Props = {
  title: string;
  description?: string;
  /** Emoji shown inside the gradient icon box, e.g. "🏋️" */
  emoji?: string;
  /** Tailwind gradient start, e.g. "from-blue-500" */
  gradientFrom?: string;
  /** Tailwind gradient end, e.g. "to-cyan-600" */
  gradientTo?: string;
  children: React.ReactNode;
};

/**
 * Single source of truth for every tool page layout:
 * - Page background
 * - Outer card container
 * - Tool header (emoji icon + h1 title + description)
 *
 * Tool components rendered as children must NOT add their own <h1>.
 */
export default function ToolPage({
  title,
  description,
  emoji,
  gradientFrom = 'from-purple-500',
  gradientTo = 'to-pink-600',
  children,
}: Props) {
  return (
    <div className="min-h-screen" style={{background:'var(--bg)'}}>
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{background:'var(--card-bg)',border:'1px solid var(--card-border)',boxShadow:'var(--shadow-soft)'}}>
          {/* Tool header — the only <h1> on the page */}
          <div className="px-6 lg:px-8 pt-8 pb-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              {emoji && (
                <div className={`p-3 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl`} style={{boxShadow:'0 8px 32px -8px rgba(124,58,237,0.35)'}}>
                  <span className="text-3xl" role="img" aria-label={title}>{emoji}</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold" style={{background:'var(--gradient-primary)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                {title}
              </h1>
            </div>
            {description && (
              <p className="text-lg max-w-2xl mx-auto" style={{color:'var(--muted)'}}>
                {description}
              </p>
            )}
          </div>
          {/* Divider between header and tool content */}
          <div style={{height:'1px', background:'var(--card-border)', margin:'0 1.5rem'}} />

          {/* Tool content */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
