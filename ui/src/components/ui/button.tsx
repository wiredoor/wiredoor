import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 as Loader } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "text-sm font-medium transition-all",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    rounded?: boolean;
    isLoading?: boolean;
    loadingText?: string;
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
    fullWidth?: boolean;
  };

type AsyncButtonProps = Omit<BaseProps, "isLoading" | "onClick"> & {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<unknown> | void;
};

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  rounded,
  loadingText,
  leadingIcon,
  trailingIcon,
  fullWidth,
  disabled,
  onClick,
  children,
  ...props
}: BaseProps) {
  const Comp = asChild ? Slot : "button";

  const isAriaDisabled = (disabled || isLoading) && asChild;
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    if (isAriaDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e as React.MouseEvent<HTMLButtonElement>);
  };

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth ? "w-full" : undefined,
        isLoading ? "cursor-wait pointer-events-none opacity-70" : undefined,
        rounded ? "rounded-full" : undefined,
        className,
      )}
      aria-disabled={isAriaDisabled || undefined}
      aria-busy={isLoading || undefined}
      disabled={!asChild && (disabled || isLoading) ? true : undefined}
      onClick={handleClick}
      {...props}
    >
      {!isLoading && leadingIcon ? (
        <span className="-ml-1 mr-2 inline-flex">{leadingIcon}</span>
      ) : null}

      {isLoading ? (
        <Loader className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}

      <span>{isLoading && loadingText ? loadingText : children}</span>

      {!isLoading && trailingIcon ? (
        <span className="ml-2 -mr-1 inline-flex">{trailingIcon}</span>
      ) : null}
    </Comp>
  );
}

function AsyncButton({ onClick, ...props }: AsyncButtonProps) {
  const [loading, setLoading] = React.useState(false);

  return (
    <Button
      {...props}
      isLoading={loading}
      onClick={async (e) => {
        const p = onClick?.(e);
        if (p && typeof p.then === "function") {
          try {
            setLoading(true);
            await p;
          } finally {
            setLoading(false);
          }
        }
      }}
    />
  );
}

export { Button, AsyncButton, buttonVariants };
