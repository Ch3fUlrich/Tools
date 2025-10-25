"use client";

import { useEffect, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

// Render `fallback` on the server and during the initial client render so
// server and client markup match. After mount, render the real children.
export default function ClientOnly({ children, fallback = null }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
