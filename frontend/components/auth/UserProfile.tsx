'use client';

import { useAuth } from './AuthContext';

export function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-lg">
            {user.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user.email}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Member since {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={handleLogout}
            className="btn-danger px-4 py-2 text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}