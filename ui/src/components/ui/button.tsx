import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 as Loader, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/foundations';

const buttonVariants = cva(
  [
    'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'select-none font-medium',
    'rounded-md',
    'text-sm leading-none',
    'transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-150 ease-out',
    'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    'outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ring-offset-background',
    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',

    // Allow runtime triggers via data attrs
    'data-[shake=true]:[animation:wd-shake_0.38s_ease-in-out_1]',
    'data-[pulse=true]:relative',
    "data-[pulse=true]:after:content-['']",
    'data-[pulse=true]:after:absolute',
    'data-[pulse=true]:after:inset-0',
    'data-[pulse=true]:after:rounded-[inherit]',
    'data-[pulse=true]:after:ring-2',
    'data-[pulse=true]:after:ring-primary/40',
    'data-[pulse=true]:after:pointer-events-none',
    'data-[pulse=true]:after:[animation:wd-pulse-ring_1.0s_ease-out_infinite]',
    'motion-reduce:data-[pulse=true]:after:animate-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary text-primary-foreground',
          'shadow-sm shadow-black/5',
          'border border-primary/20',
          'hover:bg-primary/90 hover:shadow-md hover:shadow-black/10',
          'active:translate-y-[0.5px] active:shadow-sm',
          'dark:border-primary/25 dark:shadow-black/20',
        ),
        secondary: cn(
          'bg-secondary text-secondary-foreground',
          'border border-border/60',
          'shadow-sm shadow-black/5',
          'hover:bg-secondary/80 hover:shadow-md hover:shadow-black/10',
          'active:translate-y-[0.5px]',
          'dark:border-border/60 dark:shadow-black/20',
        ),
        outline: cn(
          'bg-background text-primary',
          'border border-primary',
          'shadow-sm shadow-black/5',
          'hover:bg-accent hover:text-primary',
          'active:translate-y-[0.5px]',
          'dark:bg-background/40 dark:hover:bg-accent/40',
          'dark:text-primary-foreground/90 dark:border-primary/80',
        ),
        ghost: cn(
          'bg-transparent text-foreground',
          'hover:bg-accent/70 hover:text-accent-foreground',
          'active:bg-accent/90',
          'dark:hover:bg-accent/30 dark:active:bg-accent/45',
        ),
        destructive: cn(
          'bg-destructive text-destructive-foreground',
          'border border-destructive/20',
          'shadow-sm shadow-black/10',
          'hover:bg-destructive/90 hover:shadow-md hover:shadow-black/15',
          'active:translate-y-[0.5px]',
          'focus-visible:ring-destructive/30',
          'dark:border-destructive/25 dark:focus-visible:ring-destructive/40',
        ),
        link: cn(
          'bg-transparent p-0 h-auto',
          'font-medium',
          'text-link hover:text-link/80',
          'underline underline-offset-[4px] decoration-link/40 decoration-1',
          'hover:decoration-link/20',
          'dark:text-link dark:hover:text-link/90',
          'dark:decoration-link/90 dark:hover:decoration-link/80',
          'focus-visible:ring-0 focus-visible:ring-offset-0',
        ),
      },

      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3 rounded-md text-sm',
        lg: 'h-11 px-6 rounded-md text-sm',
        icon: 'size-10',
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
      },

      effect: {
        none: null,
        pulse: cn(
          'relative',
          "after:content-[''] after:absolute after:inset-0 after:rounded-[inherit]",
          'after:ring-2 after:ring-primary/40',
          'after:pointer-events-none',
          'after:[animation:wd-pulse-ring_1.4s_ease-out_infinite]',
          'motion-reduce:after:animate-none',
        ),
        shimmer: cn(
          'relative overflow-hidden',
          "before:absolute before:inset-0 before:content-['']",
          'before:opacity-60',
          'before:rounded-[inherit]',
          'before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.30),transparent)]',
          'dark:before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.22),transparent)]',
          'before:bg-[length:220%_100%]',
          'before:[animation:wd-shimmer_3s_ease-in-out_infinite]',
          'before:[background-position:-200%_0]',
          'before:pointer-events-none',
          'shadow-sm',
          'motion-reduce:before:animate-none',
        ),
      },
      cta: {
        none: null,
        arrow: cn(
          'group',
          'pr-3', // room for arrow
        ),
      },
    },

    compoundVariants: [
      { size: 'default', className: 'has-[>svg]:px-3' },
      { size: 'sm', className: 'gap-1.5 has-[>svg]:px-2.5' },
      { size: 'lg', className: 'has-[>svg]:px-4' },
      { variant: 'link', className: 'shadow-none border-0 rounded-none' },

      // Arrow CTA has slightly different ergonomics
      { cta: 'arrow', size: 'default', className: 'has-[.wd-arrow]:pr-3' },
      { cta: 'arrow', size: 'sm', className: 'has-[.wd-arrow]:pr-2.5' },
      { cta: 'arrow', size: 'lg', className: 'has-[.wd-arrow]:pr-4' },
    ],

    defaultVariants: {
      variant: 'default',
      size: 'default',
      effect: 'none',
      cta: 'none',
    },
  },
);

type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    rounded?: boolean;
    isLoading?: boolean;
    loadingText?: string;
    leadingIcon?: React.ReactNode | string;
    trailingIcon?: React.ReactNode;
    fullWidth?: boolean;

    // NEW
    effect?: 'none' | 'shimmer' | 'pulse';
    cta?: 'none' | 'arrow';

    // Optional runtime triggers (if you don’t want to change variants)
    shake?: boolean;
    pulse?: boolean;

    // Arrow behavior
    arrowIcon?: React.ReactNode; // default ArrowRight
    showArrow?: boolean; // if cta="arrow" and you want auto arrow
  };

type AsyncButtonProps = Omit<BaseProps, 'isLoading' | 'onClick'> & {
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

  effect = 'none',
  cta = 'none',
  shake,
  pulse,
  arrowIcon,
  showArrow,

  ...props
}: BaseProps) {
  const Comp = asChild ? Slot : 'button';

  const isAriaDisabled = (disabled || isLoading) && asChild;

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    if (isAriaDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e as React.MouseEvent<HTMLButtonElement>);
  };

  const isTrulyDisabled = disabled || isLoading;

  const autoArrow = cta === 'arrow' && showArrow !== false;

  return (
    <Comp
      data-slot='button'
      data-shake={shake ? 'true' : undefined}
      data-pulse={pulse ? 'true' : undefined}
      className={cn(
        buttonVariants({ variant, size, effect, cta }),
        fullWidth ? 'w-full' : undefined,
        rounded ? 'rounded-full' : undefined,
        isLoading ? 'cursor-wait' : undefined,
        isTrulyDisabled ? 'opacity-60' : undefined,
        className,
      )}
      tabIndex={isAriaDisabled ? -1 : props.tabIndex}
      aria-disabled={isAriaDisabled || undefined}
      aria-busy={isLoading || undefined}
      disabled={!asChild && isTrulyDisabled ? true : undefined}
      onClick={handleClick}
      {...props}
    >
      {!isLoading && leadingIcon ? (
        <span className='-ml-0.5 inline-flex'>{typeof leadingIcon === 'string' ? <Icon name={leadingIcon as any} /> : leadingIcon}</span>
      ) : null}

      {isLoading ? <Loader className='h-4 w-4 animate-spin' aria-hidden='true' /> : null}

      <span className={cn(isLoading ? 'opacity-90' : undefined)}>{isLoading && loadingText ? loadingText : children}</span>

      {!isLoading && (trailingIcon || autoArrow) ? (
        <span
          className={cn(
            'inline-flex',
            trailingIcon ? '-mr-0.5' : 'wd-arrow -mr-0.5',
            cta === 'arrow' ? 'transition-transform duration-150 ease-out group-hover:translate-x-0.5' : undefined,
          )}
        >
          {(typeof trailingIcon === 'string' ? <Icon name={trailingIcon as any} /> : trailingIcon) ?? arrowIcon ?? <ArrowRight aria-hidden='true' />}
        </span>
      ) : null}

      {isLoading ? <span className='sr-only'>{loadingText ?? 'Loading'}</span> : null}
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
        if (p && typeof (p as any).then === 'function') {
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
