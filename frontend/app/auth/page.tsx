"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm, RegisterForm } from '@/components/auth';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const router = useRouter();

  useEffect(() => {
    document.title = 'Sign In — Tools Collection';
  }, []);

  const handleSuccess = () => {
    router.push('/');
  };

  const handleClose = () => {
    type RouterWithOptionalBack = { back?: () => void; push: (url: string) => void };
    const r = router as unknown as RouterWithOptionalBack;
    if (typeof r.back === 'function') {
      r.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem 1rem',
    }}>
      <div style={{width: '100%', maxWidth: '26rem'}}>
        {/* Auth card */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--card-border)',
          borderRadius: '1rem',
          overflow: 'hidden',
          boxShadow: '0 8px 40px -8px rgba(0,0,0,0.30), 0 0 0 1px rgba(139,92,246,0.08)',
        }}>
          {/* Gradient accent stripe */}
          <div style={{height: 3, background: 'linear-gradient(to right, #7c3aed, #a855f7, #ec4899)'}} />

          {mode === 'login' ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchMode={() => setMode('register')}
              onClose={handleClose}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchMode={() => setMode('login')}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Terms */}
        <p style={{marginTop: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)'}}>
          By signing in, you agree to our{' '}
          <a href="#" style={{color: 'var(--accent)', fontWeight: 500}}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{color: 'var(--accent)', fontWeight: 500}}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
