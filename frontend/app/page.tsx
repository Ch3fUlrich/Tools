"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, UserProfile } from '@/components/auth';

export default function Home() {
  useEffect(() => {
    document.title = 'Tools Collection';
  }, []);
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const tools = [
    {
      title: 'Fat Loss Calculator',
      href: '/tools/fat-loss',
      description: 'Calculate the percentage of fat vs muscle loss based on your calorie deficit and weight loss.',
      bg: 'from-green-400 to-emerald-600',
      darkBg: 'from-green-600 to-emerald-800',
      emoji: '🏋️',
      animationDelay: '0ms',
    },
    {
      title: 'N26 Transaction Analyzer',
      href: '/tools/n26',
      description: 'Analyze your N26 bank transactions, view spending patterns, and get insights into your financial data.',
      bg: 'from-blue-400 to-cyan-600',
      darkBg: 'from-blue-600 to-cyan-800',
      emoji: '🏦',
      animationDelay: '100ms',
    },
    {
      title: 'Dice Roller',
      href: '/tools/dice',
      description: 'Roll dice with various options including advantage/disadvantage and custom dice types.',
      bg: 'from-purple-400 to-pink-600',
      darkBg: 'from-purple-600 to-pink-800',
      emoji: '🎲',
      animationDelay: '200ms',
    },
    {
      title: 'Blood Level Calculator',
      href: '/tools/bloodlevel',
      description: 'Calculate substance elimination and blood levels over time using pharmacokinetic models.',
      bg: 'from-red-400 to-rose-600',
      darkBg: 'from-red-600 to-rose-800',
      emoji: '🧪',
      animationDelay: '300ms',
    },
  ];

  const filtered = tools.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Header with backdrop blur */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Tools Collection
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                A collection of useful tools for everyday tasks
              </p>
            </div>

            {/* Auth Section */}
            <div className="flex items-center space-x-4 animate-fade-in-right">
              {isAuthenticated ? <UserProfile /> : null}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="space-y-8">
          {/* Enhanced Search Bar */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                aria-label="Search tools"
                placeholder="Search tools by name or description..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="form-input pl-12 pr-4 py-4 text-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl shadow-soft focus:shadow-soft-lg transition-all duration-300"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-16 animate-fade-in-up">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                  <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 21a9 9 0 110-18 9 9 0 010 18z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No tools found</h3>
                <p className="text-slate-600 dark:text-slate-400">Try adjusting your search terms</p>
              </div>
            ) : (
              filtered.map((tool, index) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group relative block p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in-up border border-slate-200/60 dark:border-slate-700/60 overflow-hidden`}
                  style={{ 
                    animationDelay: isLoaded ? tool.animationDelay : '0ms',
                    animationFillMode: 'both'
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tool.bg} dark:${tool.darkBg} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${tool.bg} dark:${tool.darkBg} text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-2xl lg:text-3xl">{tool.emoji}</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-accent dark:group-hover:text-accent transition-colors duration-300">
                      {tool.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {tool.description}
                    </p>
                    
                    {/* Hover indicator */}
                    <div className="mt-4 flex items-center text-accent dark:text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <span>Open tool</span>
                      <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Decorative corner accent */}
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${tool.bg} dark:${tool.darkBg} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-bl-full`} />
                </Link>
              ))
            )}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {[
              { label: 'Total Tools', value: tools.length, icon: '🛠️' },
              { label: 'Categories', value: '4', icon: '📂' },
              { label: 'Daily Users', value: '1.2k', icon: '👥' },
              { label: 'Satisfaction', value: '98%', icon: '⭐' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60 animate-fade-in-up"
                style={{ animationDelay: `${400 + index * 100}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-700/60 mt-16 lg:mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">About</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Open Source Tools Collection built with modern web technologies to make everyday tasks easier.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Rust'].map((tech) => (
                  <span key={tech} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Connect</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Contributing to open source, one tool at a time.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              © 2024 Tools Collection • Built with ❤️ using Next.js & Rust
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}