import * as React from 'react';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';

export type StatusBadgeStatus = 'neutral' | 'info' | 'success' | 'warning' | 'destructive';
export type StatusBadgeSize = 'sm' | 'default';

export type StatusBadgeProps = Omit<React.ComponentProps<typeof Badge>, 'children'> & {
  status?: StatusBadgeStatus;
  label?: React.ReactNode;
  dot?: boolean;
  size?: StatusBadgeSize;
  children?: React.ReactNode;

  /**
   * If true, uses a "soft" background using tokens. (recommended)
   * If false, it behaves closer to a normal badge.
   */
  soft?: boolean;
};

const defaultLabels: Record<StatusBadgeStatus, string> = {
  neutral: 'Neutral',
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  destructive: 'Error',
};

const statusClasses: Record<StatusBadgeStatus, { base: string; dot: string }> = {
  neutral: {
    base: 'border-border text-foreground bg-muted/40',
    dot: 'bg-muted-foreground',
  },
  info: {
    base: 'border-[color:var(--info)] text-[color:var(--info)] bg-[color-mix(in_hsl,var(--info)_12%,transparent)]',
    dot: 'bg-[color:var(--info)]',
  },
  success: {
    base: 'border-[color:var(--success)] text-[color:var(--success)] bg-[color-mix(in_hsl,var(--success)_12%,transparent)]',
    dot: 'bg-[color:var(--success)]',
  },
  warning: {
    base: 'border-[color:var(--warning)] text-[color:var(--warning)] bg-[color-mix(in_hsl,var(--warning)_12%,transparent)]',
    dot: 'bg-[color:var(--warning)]',
  },
  destructive: {
    base: 'border-[color:var(--destructive)] text-[color:var(--destructive)] bg-[color-mix(in_hsl,var(--destructive)_12%,transparent)]',
    dot: 'bg-[color:var(--destructive)]',
  },
};

const sizeClasses: Record<StatusBadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1.5',
  default: 'text-xs px-2.5 py-1 gap-2',
};

/**
 * StatusBadge: consistent status indicator used across the app.
 * Built on top of Badge and design tokens.
 */
export function StatusBadge({
  status = 'neutral',
  label,
  dot = false,
  size = 'default',
  soft = true,
  className,
  variant,
  children,
  ...props
}: StatusBadgeProps) {
  const s = statusClasses[status];
  const text = children ?? label ?? defaultLabels[status];

  // If user didn't specify badge variant, choose a safe default that doesn't fight our styles.
  const badgeVariant = variant ?? 'outline';

  return (
    <Badge variant={badgeVariant as any} className={cn('inline-flex items-center', sizeClasses[size], soft ? s.base : '', className)} {...props}>
      {dot ? <span className={cn('inline-block size-2 rounded-full', s.dot)} aria-hidden='true' /> : null}
      <span className='leading-none'>{text}</span>
    </Badge>
  );
}
