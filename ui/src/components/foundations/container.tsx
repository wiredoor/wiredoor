import * as React from "react";
import { cn } from "../../lib/utils";

export type ContainerSize = "sm" | "md" | "lg" | "xl";

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: ContainerSize;
  padded?: boolean;
};

const sizes = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
} as const;

export function Container({
  size = "lg",
  padded = true,
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        sizes[size],
        padded ? "px-4 md:px-6" : "",
        className,
      )}
      {...props}
    />
  );
}
