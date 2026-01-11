import * as React from "react";
import { cn } from "../../lib/utils";

export type Gap = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12;
const gapClasses: Record<Gap, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
};

export type StackProps = React.HTMLAttributes<HTMLDivElement> & {
  gap?: Gap;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
};

export function Stack({
  gap = 4,
  align = "stretch",
  justify = "start",
  className,
  ...props
}: StackProps) {
  const alignClass =
    align === "start"
      ? "items-start"
      : align === "center"
        ? "items-center"
        : align === "end"
          ? "items-end"
          : "items-stretch";

  const justifyClass =
    justify === "start"
      ? "justify-start"
      : justify === "center"
        ? "justify-center"
        : justify === "end"
          ? "justify-end"
          : "justify-between";

  return (
    <div
      className={cn(
        "flex flex-col",
        gapClasses[gap],
        alignClass,
        justifyClass,
        className,
      )}
      {...props}
    />
  );
}
