import * as React from 'react';
import { cn } from '../../lib/utils';

type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type Responsive<T> = Partial<Record<Breakpoint, T>>;

type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Start = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
type Order = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const bpPrefix: Record<Breakpoint, string> = {
  base: '',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:',
};

const spanClass = (n: Span) =>
  ({
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  })[n];

const startClass = (n: Start) =>
  ({
    1: 'col-start-1',
    2: 'col-start-2',
    3: 'col-start-3',
    4: 'col-start-4',
    5: 'col-start-5',
    6: 'col-start-6',
    7: 'col-start-7',
    8: 'col-start-8',
    9: 'col-start-9',
    10: 'col-start-10',
    11: 'col-start-11',
    12: 'col-start-12',
    13: 'col-start-13',
  })[n];

const orderClass = (n: Order) =>
  ({
    0: 'order-0',
    1: 'order-1',
    2: 'order-2',
    3: 'order-3',
    4: 'order-4',
    5: 'order-5',
    6: 'order-6',
    7: 'order-7',
    8: 'order-8',
    9: 'order-9',
    10: 'order-10',
    11: 'order-11',
    12: 'order-12',
  })[n];

function responsiveClasses<T extends string | number>(value: Responsive<T> | undefined, toClass: (v: T) => string) {
  if (!value) return [];
  const out: string[] = [];
  for (const [bp, v] of Object.entries(value) as [Breakpoint, T][]) {
    const prefix = bpPrefix[bp];
    out.push(prefix + toClass(v));
  }
  return out;
}

export type GridItemProps = React.HTMLAttributes<HTMLDivElement> & {
  span?: Responsive<Span>;
  start?: Responsive<Start>;
  order?: Responsive<Order>;
};

export function GridItem({ className, span, start, order, ...props }: GridItemProps) {
  return (
    <div
      className={cn(
        ...responsiveClasses(span, spanClass),
        ...responsiveClasses(start, startClass),
        ...responsiveClasses(order, orderClass),
        className,
      )}
      {...props}
    />
  );
}
