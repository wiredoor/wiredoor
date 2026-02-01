import * as React from "react";
import { X, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { AlertCard, AlertTitle, AlertDescription } from "./alert-card";

import { cn } from "@ui/lib/utils";

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

  let iconClassName = "text-card-foreground/70";
  let tone = "neutral";

  switch (variant) {
    case "info":
      iconClassName = "text-info";
      tone = "blue";
      break;
    case "success":
      iconClassName = "text-success";
      tone = "green";
      break;
    case "warning":
      iconClassName = "text-warning";
      tone = "orange";
      break;
    case "destructive":
      iconClassName = "text-destructive";
      tone = "red";
      break;
    default:
      tone = "neutral";
      break;
  }

  return (
    <AlertCard
      variant={variant}
      tone={tone as any}
      role={role ?? defaultRole(variant)}
      aria-live={role ? (role === "alert" ? "assertive" : "polite") : defaultRole(variant) === "alert" ? "assertive" : "polite"}
      className={cn("relative", className)}
      {...props}
    >
      {icon && typeof icon === "boolean" ? <IconCmp aria-hidden className={`${iconClassName} w-4 h-4 mt-0.5`} /> : icon}

      <div className="col-start-2 grid gap-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
        {children}
      </div>

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
    </AlertCard>
  );
}
