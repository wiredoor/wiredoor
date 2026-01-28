import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, mustChangePassword, requireOtp, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // o fallback (si no usas AuthGate)

  const redirectTo = `${location.pathname}${location.search}${location.hash}`;

  if (!user) {
    return <Navigate to='/login' replace state={{ redirectTo }} />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to='/change-password' replace state={{ redirectTo }} />;
  }

  if (requireOtp && location.pathname !== '/otp-verify') {
    return <Navigate to='/otp-verify' replace state={{ redirectTo }} />;
  }

  return <>{children}</>;
}
