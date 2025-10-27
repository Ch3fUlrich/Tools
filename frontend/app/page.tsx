"use client";

import Link from 'next/link';
import { useAuth, UserProfile } from '@/components/auth';

export default function Home() {
  const { isAuthenticated } = useAuth();
  // Use logout directly where needed; keep handler logic inline to avoid an unused variable.

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
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

          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div>
        {!false ? (
          // ensure an explicit mobile fallback + md two-column layout so compiled CSS includes both classes
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Fat Loss Calculator Card */}
            <Link href="/tools/fat-loss" className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-left block">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white ml-3 sm:ml-4">
                  Fat Loss Calculator
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Calculate the percentage of fat vs muscle loss based on your calorie deficit and weight loss.
              </p>
            </Link>

            {/* N26 Analyzer Card */}
            <Link href="/tools/n26" className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-left block">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white ml-3 sm:ml-4">
                  N26 Transaction Analyzer
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Analyze your N26 bank transactions, view spending patterns, and get insights into your financial data.
              </p>
            </Link>

            {/* Dice Roller Card */}
            <Link href="/tools/dice" className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-left block">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white ml-3 sm:ml-4">
                  Dice Roller
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Roll dice with various options including advantage/disadvantage and custom dice types.
              </p>
            </Link>

            {/* Tolerance Calculator Card */}
            <Link href="/tools/tolerance" className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-left block">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl sm:text-2xl">🧪</span>
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white ml-3 sm:ml-4">
                  Tolerance Calculator
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Calculate substance elimination and blood levels over time using pharmacokinetic models.
              </p>
            </Link>
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