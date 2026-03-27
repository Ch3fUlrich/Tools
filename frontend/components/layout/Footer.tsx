"use client";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Tools Collection
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Rust'].map((tech) => (
              <span key={tech} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
