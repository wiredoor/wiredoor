import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkVariants = cva(
  [
    "cursor-pointer",
    "inline-flex items-baseline",
    "rounded-[4px]",
    "font-medium leading-none",
    "transition-[color,text-decoration-color,opacity] duration-150 ease-out",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 ring-offset-background",
  ].join(" "),
  {
    variants: {
      variant: {
        default: cn("text-primary hover:text-foreground/80", "dark:text-primary dark:hover:text-foreground/80"),

        muted: cn("text-muted-foreground hover:text-foreground", "dark:hover:text-foreground"),

        subtle: cn("text-foreground/70 hover:text-foreground", "dark:text-foreground/65 dark:hover:text-foreground"),

        brand: cn("text-primary hover:text-primary/90", "dark:text-primary dark:hover:text-primary/90"),
      },

      underline: {
        none: "no-underline",
        hover: cn("no-underline", "hover:underline hover:underline-offset-[4px]", "decoration-current/30 hover:decoration-current/60"),
        always: cn("underline underline-offset-[4px]", "decoration-current/35 hover:decoration-current/70"),
      },

      size: {
        xs: "text-xs",
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      underline: "hover",
      size: "sm",
    },
  },
);

export type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "color"> &
  VariantProps<typeof linkVariants> & {
    asChild?: boolean;

    /**
     * A11y/UX: renders as disabled link (non-interactive)
     * - adds aria-disabled
     * - removes from tab order
     * - prevents click/keyboard activation
     */
    disabled?: boolean;

    /**
     * If true, sets target="_blank" and rel="noopener noreferrer"
     */
    external?: boolean;
  };

export function Link({
  className,
  variant,
  underline,
  size,
  asChild = false,
  disabled = false,
  external = false,
  href,
  onClick,
  onKeyDown,
  rel,
  target,
  tabIndex,
  ...props
}: LinkProps) {
  const Comp = asChild ? Slot : "a";

  const isDisabled = disabled;

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLAnchorElement> = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (isDisabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onKeyDown?.(e as React.KeyboardEvent<HTMLAnchorElement>);
  };

  const computedTarget = external ? "_blank" : target;
  const computedRel = external ? ["noopener", "noreferrer", rel].filter(Boolean).join(" ") : rel;

  return (
    <Comp
      data-slot="link"
      className={cn(linkVariants({ variant, underline, size }), isDisabled ? "pointer-events-none opacity-50" : undefined, className)}
      href={asChild ? undefined : href}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : tabIndex}
      target={computedTarget}
      rel={computedRel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { linkVariants };
