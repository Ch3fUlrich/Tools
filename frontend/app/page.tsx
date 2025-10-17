import ToolSelector from '@/components/ToolSelector';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Tools Collection
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            A collection of useful tools for everyday tasks
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ToolSelector />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 mt-20 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Open Source Tools Collection • Built with Next.js & Rust
          </p>
        </div>
      </footer>
    </div>
  );
}

