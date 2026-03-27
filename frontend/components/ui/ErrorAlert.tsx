"use client";

interface Props {
  error: string;
}

export default function ErrorAlert({ error }: Props) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in-up">
      <div className="flex items-center">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
      </div>
    </div>
  );
}
