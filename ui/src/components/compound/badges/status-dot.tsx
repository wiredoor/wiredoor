import * as React from 'react';
import { cn } from '../../../lib/utils';

export type StatusDotTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive';
export type StatusDotMotion = 'none' | 'pulse' | 'ping' | 'blink' | 'spin';
export type StatusDotSize = 'xs' | 'sm' | 'md' | 'lg';

export type StatusDotProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusDotTone;
  motion?: StatusDotMotion;
  size?: StatusDotSize;

  /** Adds a subtle outer ring to match premium UIs */
  halo?: boolean;

  /** A11y */
  label?: string;
};

const toneBg: Record<StatusDotTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-[color:var(--info)]',
  success: 'bg-[color:var(--success)]',
  warning: 'bg-[color:var(--warning)]',
  destructive: 'bg-[color:var(--destructive)]',
};

const toneHalo: Record<StatusDotTone, string> = {
  neutral: 'shadow-[0_0_0_3px_color-mix(in_hsl,hsl(var(--muted-foreground))_20%,transparent)]',
  info: 'shadow-[0_0_0_3px_color-mix(in_hsl,var(--info)_20%,transparent)]',
  success: 'shadow-[0_0_0_3px_color-mix(in_hsl,var(--success)_20%,transparent)]',
  warning: 'shadow-[0_0_0_3px_color-mix(in_hsl,var(--warning)_20%,transparent)]',
  destructive: 'shadow-[0_0_0_3px_color-mix(in_hsl,var(--destructive)_20%,transparent)]',
};

const sizeMap: Record<StatusDotSize, string> = {
  xs: 'size-2',
  sm: 'size-2.5',
  md: 'size-3',
  lg: 'size-4',
};

/**
 * Motion is implemented with a layered dot:
 * - base dot always visible
 * - optional animation layer behind it
 */
export function StatusDot({ className, tone = 'neutral', motion = 'none', size = 'md', halo = false, label, ...props }: StatusDotProps) {
  const sr = label ? <span className='sr-only'>{label}</span> : null;

  // Animations:
  // - ping: expanding ring (good for "reconnecting" or "connecting")
  // - pulse: subtle opacity pulse (good for "connected" / "healthy")
  // - blink: attention (warning)
  // - spin: for "loading" (rare for dot, but useful)
  const ping = motion === 'ping' ? 'absolute inset-0 rounded-full animate-ping opacity-60' : null;

  const pulse = motion === 'pulse' ? 'absolute inset-0 rounded-full animate-pulse opacity-40' : null;

  const blink = motion === 'blink' ? 'absolute inset-0 rounded-full animate-[blink_1.2s_ease-in-out_infinite]' : null;

  const spin =
    motion === 'spin'
      ? 'absolute inset-0 rounded-full animate-spin border-2 border-transparent border-t-current text-[color:var(--muted-foreground)]'
      : null;

  return (
    <span
      className={cn('relative inline-flex items-center justify-center rounded-full', sizeMap[size], halo ? toneHalo[tone] : '', className)}
      role={label ? 'status' : undefined}
      aria-label={label}
      {...props}
    >
      {/* animation layers */}
      {ping ? <span className={cn(ping, toneBg[tone])} aria-hidden='true' /> : null}
      {pulse ? <span className={cn(pulse, toneBg[tone])} aria-hidden='true' /> : null}
      {blink ? <span className={cn(blink, toneBg[tone])} aria-hidden='true' /> : null}
      {spin ? <span className={spin} aria-hidden='true' /> : null}

      {/* base dot */}
      <span className={cn('rounded-full', sizeMap[size], toneBg[tone])} aria-hidden='true' />

      {sr}
    </span>
  );
}
