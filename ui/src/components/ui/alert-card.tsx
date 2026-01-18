import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const alertCardVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "bg-card border-info text-card-foreground",
        success: "bg-card text-card-foreground",
        warning: "bg-card text-card-foreground",
        destructive: "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
      tone: {
        neutral: "border-border",
        blue: "border-blue-6",
        green: "border-green-6",
        amber: "border-amber-6",
        red: "border-red-6",
      },
    },
    compoundVariants: [
      { variant: "info", tone: "blue", class: "" },
      { variant: "success", tone: "green", class: "" },
      { variant: "warning", tone: "amber", class: "" },
      { variant: "destructive", tone: "red", class: "" },
    ],
    defaultVariants: {
      variant: "default",
      tone: "neutral",
    },
  },
);

type AlertCardProps = React.ComponentProps<"div"> & VariantProps<typeof alertCardVariants>;

function AlertCard({ className, variant, tone, ...props }: AlertCardProps) {
  return <div data-slot="alert" role="alert" className={cn(alertCardVariants({ variant, tone }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { AlertCard, AlertTitle, AlertDescription };
