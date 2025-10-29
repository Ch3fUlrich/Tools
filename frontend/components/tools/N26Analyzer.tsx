'use client';

import { useState } from 'react';
import { analyzeN26Data, AnalysisResult } from '@/lib/api/client';

export default function N26Analyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
    <div className="card text-gray-900 dark:text-white">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
        N26 Transaction Analyzer
      </h2>

      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2 text-sm sm:text-base text-gray-900 dark:text-white">About this tool:</h3>
        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
          Upload your N26 bank data export (JSON format) to analyze your transactions,
          view category totals, and get insights into your spending patterns.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-4 sm:space-y-6">
        <div>
          <label 
            htmlFor="file" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Upload N26 JSON File
          </label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              id="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              required
            />
            <label htmlFor="file" className="file-browse-label">Browse</label>
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{file ? file.name : 'No file chosen'}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
           className="btn-primary w-full text-sm sm:text-base"
        >
          {loading ? 'Analyzing...' : 'Analyze Transactions'}
        </button>
      </form>

      {error && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm sm:text-base text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          {/* Overall Total */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-white">Overall Balance</h3>
            <p className={`text-3xl sm:text-4xl font-bold ${result.overall_total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.overall_total >= 0 ? '+' : ''}{result.overall_total.toFixed(2)} €
            </p>
          </div>

          {/* Category Totals */}
          <div className="p-4 sm:p-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Category Totals</h3>
            <div className="space-y-2 sm:space-y-3">
              {Object.entries(result.category_totals).map(([category, total]) => (
                <div key={category} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-600 rounded-lg gap-2">
                  <span className="font-medium text-sm sm:text-base text-gray-700 dark:text-gray-300 truncate">{category}</span>
                  <span className={`text-base sm:text-lg font-semibold whitespace-nowrap ${total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {total >= 0 ? '+' : ''}{total.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="p-4 sm:p-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">
              Recent Transactions ({result.transactions.length} total)
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-600">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 text-left text-gray-700 dark:text-gray-300 whitespace-nowrap">Date</th>
                      <th className="px-2 sm:px-4 py-2 text-left text-gray-700 dark:text-gray-300 whitespace-nowrap">Category</th>
                      <th className="px-2 sm:px-4 py-2 text-left text-gray-700 dark:text-gray-300 hidden sm:table-cell">Comment</th>
                      <th className="px-2 sm:px-4 py-2 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {result.transactions.slice(0, 50).map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-2 sm:px-4 py-2 text-gray-900 dark:text-gray-300 whitespace-nowrap">{transaction.date}</td>
                        <td className="px-2 sm:px-4 py-2 text-gray-900 dark:text-gray-300 truncate max-w-[100px] sm:max-w-xs">{transaction.category}</td>
                        <td className="px-2 sm:px-4 py-2 text-gray-900 dark:text-gray-300 truncate max-w-xs hidden sm:table-cell">{transaction.comment}</td>
                        <td className={`px-2 sm:px-4 py-2 text-right font-semibold whitespace-nowrap ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {result.transactions.length > 50 && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
                Showing first 50 of {result.transactions.length} transactions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
