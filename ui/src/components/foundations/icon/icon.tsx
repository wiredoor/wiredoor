import * as React from 'react';
import { icons } from './registry';

export type IconRendererProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
};

export type IconRenderer = React.ComponentType<IconRendererProps>;

export type IconProps = React.HTMLAttributes<HTMLSpanElement> & {
  name: IconName;

  size?: number;

  strokeWidth?: number;

  title?: string;
  'aria-label'?: string;

  decorative?: boolean;
};

export type IconName = keyof typeof import('./registry').icons;

export function Icon(props: IconProps) {
  const { name, size = 18, strokeWidth = 2, className, title, decorative = true, 'aria-label': ariaLabel, ...spanProps } = props;

  const Renderer = icons[name];

  const isAccessible = Boolean(title || ariaLabel) && !decorative;

  return (
    <span
      {...spanProps}
      role={isAccessible ? 'img' : undefined}
      aria-label={isAccessible ? ariaLabel : undefined}
      aria-hidden={!isAccessible ? true : undefined}
    >
      <Renderer size={size} strokeWidth={strokeWidth} title={title} className={className} />
    </span>
  );
}
