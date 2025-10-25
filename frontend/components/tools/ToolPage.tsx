import Link from 'next/link';

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function ToolPage({ title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <Link href="/" className="mb-4 sm:mb-6 inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-sm sm:text-base">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tools
        </Link>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
        {description && <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-8">{description}</p>}

        <section>
          {children}
        </section>
      </main>
    </div>
  );
}
