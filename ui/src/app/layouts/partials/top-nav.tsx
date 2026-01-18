import * as React from "react";
import { cn } from "@/lib/utils";
import { Container, Inline, ContainerSize } from "@/components/foundations";
import { Logo } from "./logo";

export type TopNavProps = {
  brand?: React.ReactNode;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  sticky?: boolean;
  className?: string;
  containerSize?: ContainerSize;
};

export function TopNav({ brand, leftSlot, rightSlot, containerSize, sticky = false, className }: TopNavProps) {
  return (
    <header
      className={cn(
        sticky ? "sticky top-0 z-40" : "",
        // Vercel-like translucent header
        "bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60",
        className,
      )}
    >
      {containerSize ? (
        <Container size={containerSize} className="border-b border-border/40 py-3">
          <Inline justify="between" className="w-full">
            <div className="flex min-w-0 items-center gap-3">
              {brand ?? (
                <a href="/" aria-label="Home">
                  <Logo />
                </a>
              )}
              {/* Left */}
              <div className="min-w-0 flex-1">{leftSlot}</div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">{rightSlot}</div>
          </Inline>
        </Container>
      ) : (
        <div className="flex h-14 items-center gap-3 px-3 md:px-4 border-b border-border/40 py-3">
          {/* Left slot (breadcrumbs/workspace) */}
          {leftSlot ? <div className="min-w-0 flex-1">{leftSlot}</div> : null}

          {/* Right slot (theme, notif, user menu) */}
          {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
        </div>
      )}
    </header>
  );
}
