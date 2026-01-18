import React from "react";
import { useUIStore } from "@/stores/ui-store";

type Props = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const theme = useUIStore((s: { theme: "light" | "dark" | "system" }) => s.theme);

  React.useEffect(() => {
    const root = document.documentElement;

    const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;

    root.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  return <>{children}</>;
}
