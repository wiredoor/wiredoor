import React from "react";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AppBootstrap } from "@/app/providers/AppBootstrap";
import { Toaster } from '@/components/compound/toast';
// import { Toaster } from "@/ui/shadcn/toast"; // o "@/ui/shadcn/sonner" si usas sonner

// - Theme provider (dark/light/system)
// - Toaster/sonner
// - Bootstrap de config (tu /api/config con TTL)
// - Error boundary global (opcional)
// - “Hydration” de sesión si aplica (p.ej. leer cookie y setear estado)

type Props = { children: React.ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider>
      <AppBootstrap />
      <Toaster position="top-right" richColors />
      {children}
    </ThemeProvider>
  );
}