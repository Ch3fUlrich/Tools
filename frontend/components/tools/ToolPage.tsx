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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-200/60 dark:border-slate-700/60 overflow-hidden animate-fade-in-up">
          {/* Tool header — the only <h1> on the page */}
          <div className="px-6 lg:px-8 pt-8 pb-0 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              {emoji && (
                <div className={`p-3 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl shadow-soft-lg`}>
                  <span className="text-3xl" role="img" aria-label={title}>{emoji}</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                {title}
              </h1>
            </div>
            {description && (
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto pb-2">
                {description}
              </p>
            )}
          </div>

          {/* Tool content */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
