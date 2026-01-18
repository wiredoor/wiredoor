import * as React from "react";
import { cn } from "../../lib/utils";

export type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "muted" | "transparent";
  elevation?: "none" | "sm" | "md" | "lg";
  radius?: "sm" | "md" | "lg" | "xl";
};

const variants = {
  default: "bg-card text-card-foreground border border-border",
  muted: "bg-muted text-foreground border border-border/60",
  transparent: "bg-transparent",
} as const;

const elevations = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
} as const;

const radii = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
} as const;

export function Surface({ variant = "default", elevation = "none", radius = "lg", className, ...props }: SurfaceProps) {
  return <div className={cn(variants[variant], elevations[elevation], radii[radius], className)} {...props} />;
}
