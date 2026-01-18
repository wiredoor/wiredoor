import * as React from "react";
import { X, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { AlertCard, AlertTitle, AlertDescription } from "./alert-card";

import { cn } from "@/lib/utils";
import { Inline, Stack } from "@/components/foundations";

type BaseVariant = "default" | "info" | "success" | "warning" | "destructive";

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: BaseVariant;
  icon?: boolean | React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  dismissible?: boolean;
  open?: boolean;
  onClose?: () => void;
  autoClose?: number;
  role?: "status" | "alert";
}

const VariantIcon: Record<BaseVariant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
};

function defaultRole(variant: BaseVariant): "status" | "alert" {
  return variant === "warning" || variant === "destructive" ? "alert" : "status";
}

export function Alert({
  className,
  variant = "default",
  icon = true,
  title,
  description,
  actions,
  dismissible,
  open: openProp,
  onClose,
  autoClose,
  role,
  children,
  ...props
}: AlertProps) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(true);
  const open = isControlled ? !!openProp : internalOpen;

  React.useEffect(() => {
    if (!autoClose || !open || isControlled) return;
    const t = setTimeout(() => {
      setInternalOpen(false);
      onClose?.();
    }, autoClose);
    return () => clearTimeout(t);
  }, [autoClose, open, isControlled, onClose]);

  const handleClose = () => {
    if (!isControlled) setInternalOpen(false);
    onClose?.();
  };

  if (!open) return null;

  const IconCmp = VariantIcon[variant];

  return (
    <AlertCard
      variant={variant}
      tone={
        variant === "info"
          ? "blue"
          : variant === "success"
            ? "green"
            : variant === "warning"
              ? "amber"
              : variant === "destructive"
                ? "red"
                : "neutral"
      }
      role={role ?? defaultRole(variant)}
      aria-live={role ? (role === "alert" ? "assertive" : "polite") : defaultRole(variant) === "alert" ? "assertive" : "polite"}
      className={cn("relative", className)}
      {...props}
    >
      <Inline align="start" gap={1}>
        {icon && typeof icon === "boolean" ? <IconCmp aria-hidden className="mt-0.5 size-4" /> : icon}
        <Inline>
          <Stack gap={1} className="w-full">
            <Inline justify="between" align="start" className="w-full">
              {title && <AlertTitle>{title}</AlertTitle>}
              {(actions || dismissible) && (
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {actions}
                  {dismissible && (
                    <button
                      type="button"
                      aria-label="Dismiss"
                      className="inline-flex items-center justify-center size-6 rounded-md hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={handleClose}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              )}
            </Inline>
            {description && <AlertDescription>{description}</AlertDescription>}
            {children}
          </Stack>
        </Inline>
      </Inline>
    </AlertCard>
  );
}
