'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AutheliaButton } from '@/components/auth/AutheliaButton';
import { useOptionalAuth } from '@/components/auth/AuthContext';
import { useAuthConfig } from '@/components/auth/useAuthConfig';
import ErrorAlert from '@/components/ui/ErrorAlert';
import {
  deleteElterngeldScenario,
  listElterngeldScenarios,
  saveElterngeldScenario,
  type ElterngeldScenario,
} from '@/lib/api/client';
import { fromPayload, toPayload, type ElterngeldSnapshot } from './scenarioState';

interface SavedScenariosProps {
  /** The form as it stands right now — what "Save" would store. */
  snapshot: ElterngeldSnapshot;
  /** Called with the fields a loaded scenario carries; missing fields keep their value. */
  onLoad: (fields: Partial<ElterngeldSnapshot>) => void;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--card-border)',
  borderRadius: '0.5rem',
  background: 'var(--card-bg)',
};

/**
 * Save and reload the optimizer's inputs, per signed-in user.
 *
 * The tool itself still computes everything in the browser — nothing leaves the page until
 * the user presses Save, and then only the form fields, never a computed result. Scenarios
 * are scoped to the session's user by the backend, so this list only ever shows your own.
 */
export function SavedScenarios({ snapshot, onLoad }: SavedScenariosProps) {
  // Optional: the tool is also rendered on its own (docs, isolated tests), where there is
  // no session to speak of. No context simply means "signed out".
  const auth = useOptionalAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const authLoading = auth?.isLoading ?? false;
  const { oidcProviderName } = useAuthConfig();

  const [scenarios, setScenarios] = useState<ElterngeldScenario[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setScenarios(await listElterngeldScenarios());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your saved scenarios');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void refresh();
    // Returning the same array when it is already empty avoids a pointless re-render (and
    // the act() warning that comes with a state update nobody asked for) on every mount.
    else setScenarios((prev) => (prev.length === 0 ? prev : []));
  }, [isAuthenticated, refresh]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the scenario a name so you can find it again.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveElterngeldScenario(trimmed, toPayload(snapshot));
      setNotice(`Saved “${trimmed}”.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this scenario');
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = (scenario: ElterngeldScenario) => {
    onLoad(fromPayload(scenario.payload));
    setName(scenario.name);
    setNotice(`Loaded “${scenario.name}”.`);
    setError(null);
  };

  const handleDelete = async (scenario: ElterngeldScenario) => {
    setBusy(true);
    setError(null);
    try {
      await deleteElterngeldScenario(scenario.id);
      setNotice(`Deleted “${scenario.name}”.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this scenario');
    } finally {
      setBusy(false);
    }
  };

  // Say nothing at all while the session is still being resolved, rather than flashing the
  // signed-out prompt at a user who is in fact signed in.
  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
          Sign in to save these inputs and come back to them later. Saved scenarios are
          private to your account — nobody else can see them, and nothing is stored until you
          press Save.
        </p>
        <AutheliaButton providerName={oidcProviderName} variant="ghost" />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '0.875rem' }}>
      <form onSubmit={handleSave} aria-label="Save scenario" style={{ display: 'grid', gap: '0.5rem' }}>
        <label
          htmlFor="eg-scenario-name"
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--fg-secondary)',
          }}
        >
          Scenario name
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            id="eg-scenario-name"
            className="form-input h-12"
            style={{ flex: '1 1 12rem', minWidth: 0 }}
            value={name}
            maxLength={80}
            placeholder="e.g. 12 months basis, split 2027"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn-primary h-12" disabled={busy} style={{ flexShrink: 0 }}>
            {busy ? 'Saving…' : 'Save inputs'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
          Saving under a name you already used replaces that scenario.
        </p>
      </form>

      {error && <ErrorAlert error={error} />}
      {notice && !error && (
        // aria-live rather than role="status": the tool already has one status region
        // (the recommendation banner) and two would make announcements ambiguous.
        <p aria-live="polite" style={{ fontSize: '0.8125rem', color: 'var(--success)', margin: 0 }}>
          {notice}
        </p>
      )}

      {scenarios.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
          No saved scenarios yet.
        </p>
      ) : (
        <ul style={{ display: 'grid', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {scenarios.map((scenario) => (
            <li key={scenario.id} style={rowStyle}>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {scenario.name}
              </span>
              <span style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                <button
                  type="button"
                  className="op-btn"
                  onClick={() => handleLoad(scenario)}
                  aria-label={`Load ${scenario.name}`}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => handleDelete(scenario)}
                  disabled={busy}
                  aria-label={`Delete ${scenario.name}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SavedScenarios;
