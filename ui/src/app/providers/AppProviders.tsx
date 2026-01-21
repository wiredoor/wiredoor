import React from "react";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AppBootstrap } from "@/app/providers/AppBootstrap";
import { Toaster } from "@/components/compound/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { queryConfig } from "@/lib/react-query";
import { MainErrorFallback } from "@/components/errors/main";
import { DialogHost } from "@/components/compound/dialogs";

// - Theme provider (dark/light/system)
// - React Query provider + config
// - Toaster/sonner
// - Bootstrap de config (tu /api/config con TTL)
// - Error boundary global (opcional)
// - “Hydration” de sesión si aplica (p.ej. leer cookie y setear estado)

type Props = { children: React.ReactNode };

export function AppProviders({ children }: Props) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: queryConfig,
      }),
  );

  return (
    <ErrorBoundary FallbackComponent={MainErrorFallback}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {/* {import.meta.env.DEV && <ReactQueryDevtools />} */}
          <AppBootstrap />
          <Toaster position="top-right" richColors />
          <DialogHost />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
