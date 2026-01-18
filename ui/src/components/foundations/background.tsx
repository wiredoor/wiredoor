import { cn } from "@/lib/utils";

export type LayoutDensity = "compact" | "default" | "comfy";

export type BackgroundPreset = "none" | "grid" | "dots" | "noise" | "gradient" | "mesh";

export type Background =
  | BackgroundPreset
  | {
      preset: BackgroundPreset;
      opacity?: number; // 0..1
      className?: string;
      style?: React.CSSProperties;
    }
  | {
      /**
       * Custom background render function
       */
      render: () => React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    };

export type LayoutTokens = {
  headerHeight?: string; // "56px"
  sidebarWidth?: string; // "280px"
  sidebarCollapsedWidth?: string; // "80px"
  pagePaddingX?: string; // "24px"
  pagePaddingY?: string; // "24px"
};

function normalizeBackground(bg: Background | undefined) {
  if (!bg) return { kind: "preset" as const, preset: "grid" as BackgroundPreset };
  if (typeof bg === "string") return { kind: "preset" as const, preset: bg };
  if ("render" in bg) return { kind: "custom" as const, ...bg };
  return { kind: "preset" as const, ...bg };
}

function presetClass(preset: BackgroundPreset) {
  switch (preset) {
    case "none":
      return "";
    case "grid":
      return "bg-[radial-gradient(circle_at_1px_1px,rgba(120,120,120,0.12)_1px,transparent_0)] [background-size:24px_24px]";
    case "dots":
      return "bg-[radial-gradient(rgba(120,120,120,0.20)_1px,transparent_1px)] [background-size:18px_18px]";
    case "noise":
      return "bg-[linear-gradient(0deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)),radial-gradient(circle_at_1px_1px,rgba(120,120,120,0.10)_1px,transparent_0)] [background-size:auto,24px_24px]";
    case "gradient":
      return "bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(16,185,129,0.12),transparent_50%)]";
    case "mesh":
      return "bg-[radial-gradient(900px_circle_at_10%_20%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(800px_circle_at_70%_10%,rgba(168,85,247,0.14),transparent_55%),radial-gradient(900px_circle_at_90%_70%,rgba(34,197,94,0.10),transparent_60%)]";
    default:
      return "";
  }
}

export function BackgroundLayer({ background }: { background?: Background }) {
  const bg = normalizeBackground(background);

  if (bg.kind === "preset") {
    const preset = bg.preset as BackgroundPreset;
    const opacity = bg.opacity ?? 1;
    const className = bg.className;
    const style = bg.style as React.CSSProperties | undefined;

    if (preset === "none") return null;

    return (
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 pointer-events-none -z-10", presetClass(preset), className)}
        style={{ ...(style ?? {}), opacity }}
      />
    );
  }

  // custom render (SVG/Canvas/ReactNode)
  return (
    <div aria-hidden="true" className={cn("absolute inset-0 pointer-events-none -z-10", bg.className)} style={bg.style}>
      {bg.render()}
    </div>
  );
}
