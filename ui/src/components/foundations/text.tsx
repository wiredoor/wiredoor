import * as React from "react";
import { cn } from "../../lib/utils";

type TextVariant = "h1" | "h2" | "h3" | "h4" | "body" | "body-sm" | "caption" | "label" | "code";

type TextTone = "default" | "muted" | "subtle" | "info" | "success" | "warning" | "danger";

const variantClasses: Record<TextVariant, string> = {
  h1: "text-4xl font-semibold tracking-tight",
  h2: "text-3xl font-semibold tracking-tight",
  h3: "text-2xl font-semibold tracking-tight",
  h4: "text-xl font-semibold tracking-tight",
  body: "text-base leading-normal",
  "body-sm": "text-sm leading-normal",
  caption: "text-xs leading-normal",
  label: "text-sm font-medium leading-none",
  code: "font-mono text-sm",
};

const toneClasses: Record<TextTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  subtle: "text-foreground/80",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const alignClasses: Record<"left" | "center" | "right" | "justify", string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

export type TextProps<T extends React.ElementType> = {
  as?: T;
  variant?: TextVariant;
  tone?: TextTone;
  align?: "left" | "center" | "right" | "justify";
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "color">;

export function Text<T extends React.ElementType = "p">({ as, variant = "body", tone = "default", align, className, ...props }: TextProps<T>) {
  const Comp = (as ?? "p") as React.ElementType;
  return <Comp className={cn(variantClasses[variant], toneClasses[tone], align ? alignClasses[align] : undefined, className)} {...props} />;
}
