import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to='/' replace />;

  return <>{children}</>;
}
