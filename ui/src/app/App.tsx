import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from './router';
import { AuthGate } from './auth/auth-gate';

export default function App() {
  const queryClient = useQueryClient();
  const router = React.useMemo(() => createAppRouter(queryClient, { basename: import.meta.env.BASE_URL }), [queryClient]);
  return (
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  );
}
