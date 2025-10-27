type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function ToolPage({ title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Back link removed to simplify header navigation; header banner links are primary navigation */}

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">{description}</p>
        )}

        <section>
          {children}
        </section>
      </main>
    </div>
  );
}
