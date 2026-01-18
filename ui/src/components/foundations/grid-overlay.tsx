import * as React from "react";
import { cn } from "../../lib/utils";
import { Container, type ContainerProps } from "./container";

type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";
type Responsive<T> = Partial<Record<Breakpoint, T>>;

type LineStyle = "solid" | "dashed";

const bpPrefix: Record<Breakpoint, string> = {
  base: "",
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
  "2xl": "2xl:",
};

function responsiveVars<T extends string | number>(value: Responsive<T> | undefined, toVar: (v: T) => string) {
  if (!value) return [];
  const out: string[] = [];
  for (const [bp, v] of Object.entries(value) as [Breakpoint, T][]) {
    out.push(`${bpPrefix[bp]}${toVar(v)}`);
  }
  return out;
}

export type GridOverlayProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  containerSize?: ContainerProps["size"];
  padded?: ContainerProps["padded"];

  columns?: Responsive<number>;

  opacity?: number;

  lineWidth?: number;

  outerLines?: number;

  outerStyle?: LineStyle;
  innerStyle?: LineStyle;

  fade?: boolean;

  insetY?: number;
};

function borderClass(style: LineStyle) {
  return style === "dashed" ? "border-l border-dashed" : "border-l border-solid";
}

export function DashedDivider({ className, dash = 6, gap = 6, opacity = 0.16, ...props }: DashedDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-px w-full", className)}
      style={{
        backgroundImage: `repeating-linear-gradient(to right,
          rgba(255,255,255,${opacity}) 0 ${dash}px,
          transparent ${dash}px ${dash + gap}px
        )`,
      }}
      {...props}
    />
  );
}

export function GridOverlay({
  className,
  containerSize = "lg",
  padded = true,
  columns = { base: 4, md: 12 },
  opacity = 0.055,
  lineWidth = 1,
  outerLines = 2,
  outerStyle = "solid",
  innerStyle = "dashed",
  fade = true,
  insetY = 0,
  ...props
}: GridOverlayProps) {
  const baseCols = typeof columns.base === "number" ? columns.base : 4;

  const fadeStyle: React.CSSProperties | undefined = fade
    ? {
        maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 18%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 18%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 100%)",
      }
    : undefined;

  // --grid-cols responsive var classes
  const colVarClasses = responsiveVars(columns, (v) => `[--grid-cols:${v}]`);

  const lineColor = `color-mix(in oklab, currentColor ${opacity * 100}%, transparent)`;

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 z-0", className)} {...props}>
      <Container
        size={containerSize}
        padded={padded}
        className={cn("relative h-full", ...colVarClasses)}
        style={{
          ...fadeStyle,
          paddingTop: insetY,
          paddingBottom: insetY,
        }}
      >
        <div className="relative h-full w-full">
          {/* We use baseCols to generate the number of lines. The actual columns
              used will be controlled by the CSS variable --grid-cols set on the container. */}
          {Array.from({ length: baseCols + 1 }).map((_, i) => {
            const cols = baseCols;
            const lineCount = cols + 1;

            const isLeftEdge = i === 0;
            const isRightEdge = i === lineCount - 1;
            const isOuter = isLeftEdge || isRightEdge || i <= outerLines || i >= lineCount - 1 - outerLines;

            const style = isOuter ? outerStyle : innerStyle;

            return (
              <div
                key={i}
                className={cn("absolute top-0 h-full", borderClass(style), style === "dashed" ? "[border-left-style:dashed]" : "")}
                style={{
                  left: `${(i / cols) * 100}%`,
                  borderLeftColor: lineColor,
                  borderLeftWidth: lineWidth,
                }}
              />
            );
          })}
        </div>
      </Container>
    </div>
  );
}

export function ResponsiveGridOverlay() {
  return (
    <>
      <GridOverlay className="md:hidden" columns={{ base: 4 }} outerLines={2} />
      <GridOverlay className="hidden md:block" columns={{ base: 6 }} outerLines={2} />
    </>
  );
}

export type DashedDividerProps = React.HTMLAttributes<HTMLDivElement> & {
  dash?: number;
  gap?: number;
  opacity?: number;
};
