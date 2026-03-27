'use client';

import { useState } from 'react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import CardSection from '@/components/ui/CardSection';
import { analyzeN26Data, AnalysisResult } from '@/lib/api/client';

export default function N26Analyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setError(null);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const fileContent = await file.text();
      const jsonData = JSON.parse(fileContent);
      const response = await analyzeN26Data(jsonData);
      setResult(response);
    } catch {
      setError('Failed to analyze file. Please ensure it\'s a valid N26 JSON export.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Upload Card */}
      <CardSection title="Upload Data" gradient="from-blue-500 to-cyan-600" delay="100ms">

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Export your N26 data as JSON from the N26 app under <strong>Account → Export Transactions</strong>, then upload it here. Your data is processed locally and never stored.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label
              htmlFor="file"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3"
            >
              Upload N26 JSON File
            </label>

            {/* Drag-and-drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
                  : file
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="file"
                id="file"
                accept=".json"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <div className="pointer-events-none space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                  {file ? (
                    <span className="text-2xl">✅</span>
                  ) : isDragging ? (
                    <span className="text-2xl">📂</span>
                  ) : (
                    <span className="text-2xl">📁</span>
                  )}
                </div>
                {file ? (
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {(file.size / 1024).toFixed(1)} KB · Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {isDragging ? 'Drop your file here' : 'Drag & drop your JSON file'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      or click anywhere to browse
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="btn-primary w-full h-12 text-base font-semibold shadow-soft-lg hover:shadow-soft-xl transition-all duration-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="spinner mr-3" />
                Analyzing...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>📊</span>
                Analyze Transactions
              </div>
            )}
          </button>
        </form>

        {error && <ErrorAlert error={error} />}
      </CardSection>

      {result && (
        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Overall Balance */}
          <CardSection title="Overall Balance" gradient="from-emerald-500 to-green-600">
            <div className={`text-4xl sm:text-5xl font-bold ${result.overall_total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.overall_total >= 0 ? '+' : ''}{result.overall_total.toFixed(2)} €
            </div>
          </CardSection>

          {/* Category Totals */}
          <CardSection title="Category Totals" gradient="from-blue-500 to-indigo-600">
            <div className="space-y-2">
              {Object.entries(result.category_totals)
                .sort(([, a], [, b]) => a - b)
                .map(([category, total]) => (
                  <div key={category} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors duration-150">
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate mr-4">{category}</span>
                    <span className={`text-base font-semibold whitespace-nowrap tabular-nums ${total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {total >= 0 ? '+' : ''}{total.toFixed(2)} €
                    </span>
                  </div>
                ))}
            </div>
          </CardSection>

          {/* Transactions Table */}
          <CardSection title={`Recent Transactions (${result.transactions.length} total)`} gradient="from-purple-500 to-violet-600">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Category</th>
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Comment</th>
                    <th className="pb-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.transactions.slice(0, 50).map((transaction, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-100">
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">{transaction.date}</td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-300 truncate max-w-[100px] sm:max-w-xs">{transaction.category}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 truncate max-w-xs hidden sm:table-cell">{transaction.comment}</td>
                      <td className={`py-3 text-right font-semibold whitespace-nowrap tabular-nums ${transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.transactions.length > 50 && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                Showing first 50 of {result.transactions.length} transactions
              </p>
            )}
          </CardSection>
        </div>
      )}
    </div>
  );
}
