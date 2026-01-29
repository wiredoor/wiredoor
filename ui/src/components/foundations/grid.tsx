import * as React from 'react';
import { cn } from '@/lib/utils';

type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type Responsive<T> = Partial<Record<Breakpoint, T>>;

type Columns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
type Align = 'start' | 'center' | 'end' | 'stretch';

const bpPrefix: Record<Breakpoint, string> = {
  base: '',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:',
};

const colsClass = (n: Columns): string =>
  ({
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  })[n];

const gapClass = (g: Gap): string =>
  ({
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
  })[g];

const alignItemsClass: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

function responsiveClasses<T extends string | number>(value: Responsive<T> | undefined, toClass: (v: T) => string) {
  if (!value) return [];
  const out: string[] = [];
  for (const [bp, v] of Object.entries(value) as [Breakpoint, T][]) {
    const prefix = bpPrefix[bp];
    out.push(prefix + toClass(v));
  }
  return out;
}

export type GridProps = React.HTMLAttributes<HTMLDivElement> & {
  columns?: Responsive<Columns>; // example: { base: 1, md: 12 }
  gap?: Responsive<Gap>;
  align?: Align;
  dense?: boolean;
  autoRows?: 'auto' | 'min' | 'fr';
};

export function Grid({
  className,
  columns = { base: 1 },
  gap = { base: 4 },
  align = 'stretch',
  dense = false,
  autoRows = 'auto',
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        'grid',
        ...responsiveClasses(columns, colsClass),
        ...responsiveClasses(gap, gapClass),
        alignItemsClass[align],
        dense ? 'grid-flow-row-dense' : '',
        autoRows === 'min' ? 'auto-rows-min' : '',
        autoRows === 'fr' ? 'auto-rows-fr' : '',
        className,
      )}
      {...props}
    />
  );
}
