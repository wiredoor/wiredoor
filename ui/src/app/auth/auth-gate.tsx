import * as React from 'react';
import { useAuth } from '@/lib/auth';

export function AuthGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) return <>{fallback ?? null}</>;
  return <>{children}</>;
}
