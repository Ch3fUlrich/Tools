"use client";

import React from 'react';
import { AuthProvider } from './AuthContext';

interface Props {
  children: React.ReactNode;
}

export default function AuthProviderClient({ children }: Props) {
  return <AuthProvider>{children}</AuthProvider>;
}
