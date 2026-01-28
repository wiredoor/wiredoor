import * as React from 'react';
import { cn } from '../../lib/utils';

type Gap = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12;
const gapClasses: Record<Gap, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

export type InlineProps = React.HTMLAttributes<HTMLDivElement> & {
  gap?: Gap;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between';
  wrap?: boolean;
};

export function Inline({ gap = 3, align = 'center', justify = 'start', wrap = false, className, ...props }: InlineProps) {
  const alignClass =
    align === 'start'
      ? 'items-start'
      : align === 'end'
        ? 'items-end'
        : align === 'stretch'
          ? 'items-stretch'
          : align === 'baseline'
            ? 'items-baseline'
            : 'items-center';

  const justifyClass =
    justify === 'start' ? 'justify-start' : justify === 'center' ? 'justify-center' : justify === 'end' ? 'justify-end' : 'justify-between';

  return <div className={cn('flex', wrap ? 'flex-wrap' : 'flex-nowrap', gapClasses[gap], alignClass, justifyClass, className)} {...props} />;
}
