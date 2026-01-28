import * as React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { cn } from '@/lib/utils';

export type ToasterProps = React.ComponentProps<typeof SonnerToaster> & {
  className?: string;
};

export function Toaster({ className, ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className={cn('toaster group', className)}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80',
        },
      }}
      {...props}
    />
  );
}
