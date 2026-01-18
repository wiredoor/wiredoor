import * as React from "react";
import { cn } from "../../../lib/utils";

export type StepsPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  stepKey: string | number;
  direction?: "forward" | "back";
};

export function StepsPanel({ stepKey, direction = "forward", className, children, ...props }: StepsPanelProps) {
  // key forces re-mount per step for animation
  const animIn = direction === "forward" ? "step-anim-in-right" : "step-anim-in-left";

  return (
    <div
      key={stepKey}
      className={cn(
        "w-full",
        animIn,
        "animate-[stepInRight_220ms_ease-out] md:animate-[stepInRight_240ms_ease-out]",
        direction === "back" ? "animate-[stepInLeft_220ms_ease-out] md:animate-[stepInLeft_240ms_ease-out]" : undefined,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
