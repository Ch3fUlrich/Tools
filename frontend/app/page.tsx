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
      gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
      glowColor: 'rgba(52,211,153,0.25)',
      emoji: '🏋️',
      animationDelay: '0ms',
    },
    {
      title: 'N26 Transaction Analyzer',
      href: '/tools/n26',
      description: 'Analyze your N26 bank transactions, view spending patterns, and get insights into your financial data.',
      gradient: 'linear-gradient(135deg, #60a5fa 0%, #0284c7 100%)',
      glowColor: 'rgba(96,165,250,0.25)',
      emoji: '🏦',
      animationDelay: '100ms',
    },
    {
      title: 'Dice Roller',
      href: '/tools/dice',
      description: 'Roll dice with various options including advantage/disadvantage and custom dice types.',
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
      glowColor: 'rgba(167,139,250,0.25)',
      emoji: '🎲',
      animationDelay: '200ms',
    },
    {
      title: 'Blood Level Calculator',
      href: '/tools/bloodlevel',
      description: 'Calculate substance elimination and blood levels over time using pharmacokinetic models.',
      gradient: 'linear-gradient(135deg, #f87171 0%, #db2777 100%)',
      glowColor: 'rgba(248,113,113,0.25)',
      emoji: '🧪',
      animationDelay: '300ms',
    },
  ];

  const filtered = tools.filter(t =>
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    t.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{background:'var(--bg)'}}>
      {/* Hero section */}
      <section style={{background:'linear-gradient(135deg, var(--bg) 0%, var(--bg-secondary) 100%)', borderBottom:'1px solid var(--card-border)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in-up">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold" style={{background:'var(--gradient-primary)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                Tools Collection
              </h1>
              <p className="mt-2 text-sm sm:text-base" style={{color:'var(--muted)'}}>
                A collection of useful tools for everyday tasks
              </p>
            </div>

            {/* Auth Section */}
            <div className="flex items-center space-x-4 animate-fade-in-up">
              {isAuthenticated ? <UserProfile /> : null}
            </div>
          </div>
        </div>
      </section>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16" style={{color:'var(--fg)'}}>
        <div className="space-y-8">
          {/* Search Bar */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div className="relative max-w-2xl mx-auto">
              <input
                type="search"
                aria-label="Search tools"
                placeholder="Search tools by name or description..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{paddingRight:'3rem'}}
                className="form-input pr-12 py-4 text-lg rounded-xl shadow-soft focus:shadow-soft-lg transition-all duration-300"
              />
              {/* Search icon — right side, vertically centered */}
              {!query && (
                <div style={{position:'absolute', inset:'0 0.875rem 0 auto', display:'flex', alignItems:'center', pointerEvents:'none'}}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:20,height:20,color:'var(--muted)',flexShrink:0}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
              {/* Clear button — appears when typing */}
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  style={{position:'absolute', inset:'0 0 0 auto', width:'3rem', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', background:'none', border:'none', cursor:'pointer'}}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Tools Grid */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'1.5rem'}}>
            {filtered.length === 0 ? (
              <div className="animate-fade-in-up" style={{gridColumn:'1/-1', textAlign:'center', padding:'4rem 0'}}>
                <div className="inline-flex items-center justify-center rounded-full mb-4" style={{width:64,height:64,background:'var(--input-bg)'}}>
                  <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:32,height:32,color:'var(--muted)'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 21a9 9 0 110-18 9 9 0 010 18z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{color:'var(--fg)'}}>No tools found</h3>
                <p style={{color:'var(--muted)'}}>Try adjusting your search terms</p>
              </div>
            ) : (
              filtered.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group relative block overflow-hidden rounded-2xl no-underline animate-fade-in-up transition-all duration-300 hover:-translate-y-1`}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    boxShadow: 'var(--shadow-soft)',
                    padding: '1.5rem 2rem',
                    animationDelay: isLoaded ? tool.animationDelay : '0ms',
                    animationFillMode: 'both'
                  }}
                >
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon box with gradient */}
                    <div className="inline-flex items-center justify-center rounded-xl mb-4 transition-transform duration-300 group-hover:scale-110"
                      style={{width:52,height:52,background:tool.gradient,boxShadow:`0 8px 24px -4px ${tool.glowColor}`}}>
                      <span style={{fontSize:'1.5rem'}}>{tool.emoji}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg lg:text-xl font-bold mb-3 transition-colors duration-300" style={{color:'var(--fg)'}}>
                      {tool.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm lg:text-base leading-relaxed line-clamp-3" style={{color:'var(--muted)'}}>
                      {tool.description}
                    </p>
                  </div>

                  {/* Full-card gradient overlay on hover */}
                  <div
                    className="opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                    style={{position:'absolute', inset:0, background:tool.gradient}}
                  />
                </Link>
              ))
            )}
          </div>

          {/* Features strip */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'1rem', marginTop:'3rem'}}>
            {[
              { label: `${tools.length} Tools`, detail: 'Growing collection', icon: '🛠️' },
              { label: 'Dark Mode', detail: 'Light & dark themes', icon: '🌙' },
              { label: 'Open Source', detail: 'MIT licensed', icon: '💻' },
              { label: 'Privacy First', detail: 'No tracking', icon: '🔒' },
            ].map((feat, index) => (
              <div
                key={feat.label}
                className="rounded-xl animate-fade-in-up"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  padding: '1rem',
                  animationDelay: `${400 + index * 100}ms`,
                  animationFillMode: 'both'
                }}
              >
                <span className="text-2xl block mb-2">{feat.icon}</span>
                <p className="font-semibold text-sm" style={{color:'var(--fg)'}}>{feat.label}</p>
                <p className="text-xs mt-0.5" style={{color:'var(--muted)'}}>{feat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
