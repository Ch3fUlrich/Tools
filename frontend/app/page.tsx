"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth, UserProfile } from '@/components/auth';

export default function Home() {
  useEffect(() => {
    document.title = 'Tools';
  }, []);
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = React.useState('');

  const tools = [
    {
      title: 'Fat Loss Calculator',
      href: '/tools/fat-loss',
      description: 'Calculate the percentage of fat vs muscle loss based on your calorie deficit and weight loss.',
      bg: 'bg-green-100',
      darkBg: 'dark:bg-green-900',
      emoji: '🏋️',
    },
    {
      title: 'N26 Transaction Analyzer',
      href: '/tools/n26',
      description: 'Analyze your N26 bank transactions, view spending patterns, and get insights into your financial data.',
      bg: 'bg-blue-100',
      darkBg: 'dark:bg-blue-900',
      emoji: '🏦',
    },
    {
      title: 'Dice Roller',
      href: '/tools/dice',
      description: 'Roll dice with various options including advantage/disadvantage and custom dice types.',
      bg: 'bg-purple-100',
      darkBg: 'dark:bg-purple-900',
      emoji: '🎲',
    },
    {
      title: 'Blood Level Calculator',
      href: '/tools/bloodlevel',
      description: 'Calculate substance elimination and blood levels over time using pharmacokinetic models.',
      bg: 'bg-green-100',
      darkBg: 'dark:bg-green-900',
      emoji: '🧪',
    },
  ];

  const filtered = tools.filter(t => t.description.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-none bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Tools Collection
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                A collection of useful tools for everyday tasks
              </p>
            </div>

            {/* Auth Section - moved sign-in into header banner */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? <UserProfile /> : null}
            </div>
          </div>
        </div>
      </header>

  <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div>
          {/* Search bar (no button) */}
          <div className="mb-6">
            <input
              type="search"
              aria-label="Search tools"
              placeholder="Search tools by description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {!false ? (
            // ensure an explicit mobile fallback + md two-column layout so compiled CSS includes both classes
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {filtered.length === 0 ? (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-gray-500 dark:text-gray-400">No tools match your search.</div>
              ) : filtered.map((t) => (
                <Link key={t.href} href={t.href} className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-left block no-underline">
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.darkBg}`}>
                      <span className="text-lg sm:text-2xl">{t.emoji}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white ml-3 sm:ml-4">
                      {t.title}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    <span aria-hidden className="mr-1">{t.emoji}</span>
                    {t.description}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 mt-12 sm:mt-16 lg:mt-20 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Open Source Tools Collection • Built with Next.js & Rust
          </p>
        </div>
      </footer>
    </div>
  );
}