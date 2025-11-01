type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function ToolPage({ title, description: _description, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="animate-fade-in-up">
          {/* Enhanced Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">
              {title}
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          </div>

          {/* Tool Content */}
          <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
              {children}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}