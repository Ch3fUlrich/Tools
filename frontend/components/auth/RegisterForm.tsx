'use client';

import { useState } from 'react';
import { registerUser, startOIDCLogin } from '@/lib/api/client';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchMode?: () => void;
  onClose?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchMode, onClose }: RegisterFormProps) {
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
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18}}>
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
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18,color:'var(--muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
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
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18,color:'var(--muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
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
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18,color:'var(--muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <input
                type="password"
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
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:16,height:16,color:'var(--error)',flexShrink:0}}>
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
              <svg style={{width:18,height:18,animation:'spin 0.8s linear infinite'}} viewBox="0 0 24 24" fill="none">
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
        <span style={{fontSize:'0.8125rem', color:'var(--muted)', whiteSpace:'nowrap'}}>Or continue with</span>
        <div style={{flex:1, height:1, background:'var(--card-border)'}} />
      </div>

      {/* Google button */}
      <button
        onClick={startOIDCLogin}
        className="btn-ghost w-full h-12"
        type="button"
        style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'0.625rem', fontSize:'0.9375rem', fontWeight:600}}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" style={{width:20,height:20,flexShrink:0}}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

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
