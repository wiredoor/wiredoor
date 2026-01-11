import * as React from "react";
import { icons } from "./registry";

export type IconRendererProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
};

export type IconRenderer = React.ComponentType<IconRendererProps>;

export type IconProps = React.HTMLAttributes<HTMLSpanElement> & {
  name: IconName;

  /** Tamaño en px (default 18) */
  size?: number;

  /** Para librerías stroke-based (lucide) */
  strokeWidth?: number;

  /** Accesibilidad */
  title?: string;
  "aria-label"?: string;

  /** Si true, renderiza <span aria-hidden /> por defecto */
  decorative?: boolean;
};

export type IconName = keyof typeof import("./registry").icons;

export function Icon(props: IconProps) {
  const {
    name,
    size = 18,
    strokeWidth = 2,
    className,
    title,
    decorative = true,
    "aria-label": ariaLabel,
    ...spanProps
  } = props;

  const Renderer = icons[name];

  const isAccessible = Boolean(title || ariaLabel) && !decorative;

  return (
    <span
      {...spanProps}
      className={className}
      role={isAccessible ? "img" : undefined}
      aria-label={isAccessible ? ariaLabel : undefined}
      aria-hidden={!isAccessible ? true : undefined}
    >
      <Renderer size={size} strokeWidth={strokeWidth} title={title} />
    </span>
  );
}
