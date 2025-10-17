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
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        N26 Transaction Analyzer
      </h2>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">About this tool:</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Upload your N26 bank data export (JSON format) to analyze your transactions,
          view category totals, and get insights into your spending patterns.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-6">
        <div>
          <label 
            htmlFor="file" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Upload N26 JSON File
          </label>
          <input
            type="file"
            id="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-600 dark:file:text-gray-200"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Analyzing...' : 'Analyze Transactions'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* Overall Total */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Overall Balance</h3>
            <p className={`text-4xl font-bold ${result.overall_total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.overall_total >= 0 ? '+' : ''}{result.overall_total.toFixed(2)} €
            </p>
          </div>

          {/* Category Totals */}
          <div className="p-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Category Totals</h3>
            <div className="space-y-3">
              {Object.entries(result.category_totals).map(([category, total]) => (
                <div key={category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{category}</span>
                  <span className={`text-lg font-semibold ${total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {total >= 0 ? '+' : ''}{total.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="p-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Recent Transactions ({result.transactions.length} total)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Date</th>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Category</th>
                    <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Comment</th>
                    <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {result.transactions.slice(0, 50).map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-300">{transaction.date}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-300">{transaction.category}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-300 truncate max-w-xs">{transaction.comment}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.transactions.length > 50 && (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                Showing first 50 of {result.transactions.length} transactions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
