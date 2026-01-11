import React from "react";
import { useConfigStore } from "@/stores/config-store";

export function AppBootstrap() {
  const loadConfig = useConfigStore((s) => s.loadConfig);

  React.useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return null;
}

// to prevent double execution in StrictMode during development (React 18/19)
// export function AppBootstrap() {
//   const loadConfig = useConfigStore((s) => s.loadConfig);
//   const ran = React.useRef(false);

//   React.useEffect(() => {
//     if (ran.current) return;
//     ran.current = true;
//     loadConfig();
//   }, [loadConfig]);

//   return null;
// }