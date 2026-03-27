'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile, type UserProfileResponse } from '@/lib/api/client';

export function UserProfile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.display_name ?? '');
      })
      .catch(() => {
        // Profile fetch failed — fall back to auth context user
      });
  }, [user]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Logout error:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateUserProfile(displayName);
      setProfile((prev) => prev ? { ...prev, display_name: displayName || undefined } : prev);
      setEditing(false);
    } catch {
      setError('Failed to save display name.');
    } finally {
      setSaving(false);
    }
  };

  const email = profile?.email ?? user.email;
  const name = profile?.display_name || email;
  const initial = name.charAt(0).toUpperCase();
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : new Date(user.created_at).toLocaleDateString();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white font-semibold text-lg">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="flex-1 px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-3 py-1 text-sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setDisplayName(profile?.display_name ?? ''); setError(null); }}
                className="btn-ghost px-3 py-1 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {profile?.display_name || email}
              </h3>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                edit
              </button>
            </div>
          )}
          {profile?.display_name && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{email}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">Member since {since}</p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <button
          onClick={handleLogout}
          className="btn-danger px-4 py-2 text-sm shrink-0"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
