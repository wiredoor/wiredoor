import * as React from "react";
import { cn } from "@/lib/utils";
import { Container, Inline, ContainerSize } from "@/components/foundations";
import { ThemeToggle } from './theme-toggle';
import { Logo } from './logo';

export type TopNavProps = {
  brand?: React.ReactNode;
  right?: React.ReactNode;
  sticky?: boolean;
  className?: string;
  containerSize?: ContainerSize;
};

export function TopNav({
  brand,
  right,
  sticky = false,
  className,
  containerSize = "lg",  
}: TopNavProps) {
  return (
    <div
      className={cn(
        sticky ? "sticky top-0 z-40" : "",
        "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <Container size={containerSize} className="border-b border-border/40 py-3">
        <Inline justify="between" className="w-full">
          <div className="flex min-w-0 items-center gap-3">
            {brand ?? (
              <Inline className="items-center gap-2">
                <Logo />
              </Inline>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {right}
          </div>
        </Inline>
      </Container>
    </div>
  );
}