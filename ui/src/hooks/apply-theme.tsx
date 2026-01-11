import * as React from "react";
import { useUIStore } from "@/stores/ui-store";

type Theme = "light" | "dark" | "system";

function resolveSystemTheme(): "light" | "dark" {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  const effective = theme === "system" ? resolveSystemTheme() : theme;
  root.classList.toggle("dark", effective === "dark");
}

export function useApplyTheme() {
  const theme = useUIStore((s) => s.theme);

  React.useEffect(() => {
    applyThemeToDOM(theme);

    if (theme !== "system") return;

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => applyThemeToDOM("system");

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [theme]);
}