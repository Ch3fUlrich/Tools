type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function ToolPage({ title, description: _description, children }: Props) {
  return (
    // Provide a safe default text color at page root so children using currentColor/text-current are readable
    <div className="min-h-screen bg-none bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 text-gray-900 dark:text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Back link removed to simplify header navigation; header banner links are primary navigation */}

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
        {/* Page-level descriptions are removed — keep only per-card descriptions */}

        <section>
          {children}
        </section>
      </main>
    </div>
  );
}
