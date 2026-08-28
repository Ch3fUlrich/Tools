'use client';

import { useState } from 'react';
import { registerUser } from '@/lib/api/client';
import { AutheliaButton } from './AutheliaButton';
import { useAuthConfig } from './useAuthConfig';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchMode?: () => void;
  onClose?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchMode, onClose }: RegisterFormProps) {
  const authConfig = useAuthConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await registerUser({ email, password });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* position:relative so the absolute close button stays inside this card */
    <div className="w-full max-w-md mx-auto" style={{padding:'2rem', position:'relative'}}>

      {/* Close button — top-right */}
      {onClose && (
        <button
          onClick={onClose}
          className="remove-btn"
          aria-label="Close"
          title="Close"
          style={{position:'absolute', top:'1rem', right:'1rem', zIndex:10}}
        >
          <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Header */}
      <div style={{textAlign:'center', marginBottom:'2rem'}}>
        <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:80, height:80, background:'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', borderRadius:'1.25rem', marginBottom:'1rem', boxShadow:'0 8px 24px -4px rgba(124,58,237,0.3)'}}>
          <span style={{fontSize:'2.25rem', lineHeight:1}}>✨</span>
        </div>
        <h2 style={{fontSize:'1.5rem', fontWeight:700, color:'var(--fg)', marginBottom:'0.375rem'}}>Create Account</h2>
        <p style={{fontSize:'0.9375rem', color:'var(--muted)'}}>Sign up to get started</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'1.25rem'}}>
        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div>
            <label htmlFor="email" style={{display:'block', fontSize:'0.875rem', fontWeight:500, color:'var(--fg)', marginBottom:'0.5rem'}}>
              Email
            </label>
            <div style={{position:'relative'}}>
              <div style={{position:'absolute', inset:'0 auto 0 0', paddingLeft:'0.75rem', display:'flex', alignItems:'center', pointerEvents:'none'}}>
                <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18,color:'var(--muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                autoComplete="username"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input h-12"
                style={{paddingLeft:'2.5rem'}}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" style={{display:'block', fontSize:'0.875rem', fontWeight:500, color:'var(--fg)', marginBottom:'0.5rem'}}>
              Password
            </label>
            <div style={{position:'relative'}}>
              <div style={{position:'absolute', inset:'0 auto 0 0', paddingLeft:'0.75rem', display:'flex', alignItems:'center', pointerEvents:'none'}}>
                <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18,color:'var(--muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                autoComplete="new-password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input h-12"
                style={{paddingLeft:'2.5rem'}}
                placeholder="••••••••"
                required
              />
            </div>
            <p style={{fontSize:'0.75rem', color:'var(--muted)', marginTop:'0.375rem'}}>Must be at least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" style={{display:'block', fontSize:'0.875rem', fontWeight:500, color:'var(--fg)', marginBottom:'0.5rem'}}>
              Confirm Password
            </label>
            <div style={{position:'relative'}}>
              <div style={{position:'absolute', inset:'0 auto 0 0', paddingLeft:'0.75rem', display:'flex', alignItems:'center', pointerEvents:'none'}}>
                <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18,color:'var(--muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <input
                type="password"
                autoComplete="new-password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input h-12"
                style={{paddingLeft:'2.5rem'}}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'0.75rem', padding:'0.75rem 1rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <svg aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:16,height:16,color:'var(--error)',flexShrink:0}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{fontSize:'0.875rem', color:'var(--error)'}}>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full h-12 text-base font-semibold"
          style={{marginTop:'0.25rem'}}
        >
          {isLoading ? (
            <span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}}>
              <svg aria-hidden="true" style={{width:18,height:18,animation:'spin 0.8s linear infinite'}} viewBox="0 0 24 24" fill="none">
                <circle style={{opacity:0.25}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{opacity:0.75}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating Account…
            </span>
          ) : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div style={{marginTop:'1.75rem', marginBottom:'1.25rem', position:'relative', display:'flex', alignItems:'center', gap:'1rem'}}>
        <div style={{flex:1, height:1, background:'var(--card-border)'}} />
        <span style={{fontSize:'0.8125rem', color:'var(--muted)', whiteSpace:'nowrap'}}>Or</span>
        <div style={{flex:1, height:1, background:'var(--card-border)'}} />
      </div>

      <AutheliaButton providerName={authConfig.oidcProviderName} variant="ghost" />

      {/* Switch to login */}
      <p style={{marginTop:'1.5rem', textAlign:'center', fontSize:'0.9375rem', color:'var(--muted)'}}>
        Already have an account?{' '}
        <button
          onClick={onSwitchMode}
          style={{color:'var(--accent)', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontSize:'inherit'}}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
