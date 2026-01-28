import * as React from 'react';
import { cn } from '@/lib/utils';

type FieldButtonProps = React.ComponentProps<'button'> & {
  /** Para que puedas forzar aria-invalid igual que en inputs */
  'aria-invalid'?: boolean | 'true' | 'false';
};

const FieldButton = React.forwardRef<HTMLButtonElement, FieldButtonProps>(({ className, type = 'button', ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      data-slot='input-button'
      className={cn(
        'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        'text-left inline-flex items-center',
        className,
      )}
      {...props}
    />
  );
});

FieldButton.displayName = 'FieldButton';

export { FieldButton };
