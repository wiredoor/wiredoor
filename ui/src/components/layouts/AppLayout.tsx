import * as React from "react";
import { cn } from "@/lib/utils";

import { Container } from "@/components/foundations";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export type AppLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  headerSlot?: React.ReactNode;

  sidebarSlot?: React.ReactNode;

  footerSlot?: React.ReactNode;

  mainScrollable?: boolean;

  constrainContent?: boolean;
};

export function AppLayout({
  className,
  headerSlot,
  sidebarSlot,
  footerSlot,
  mainScrollable = true,
  constrainContent = true,
  children,
  ...rest
}: AppLayoutProps) {
  return (
    <div
      {...rest}
      className={cn(
        "min-h-dvh w-full bg-background text-foreground",
        // Subtle app-shell background depth (Vercel-ish)
        "bg-[radial-gradient(80%_60%_at_50%_0%,hsl(var(--primary)/0.10),transparent_60%)]",
        className,
      )}
    >
      {sidebarSlot ? (
        <SidebarProvider>
          <div className="flex min-h-dvh w-full">
            {sidebarSlot}

            <SidebarInset
              className={cn(
                "min-w-0 flex-1",
                // If internal scroll: inset is height-limited and scroll happens in main region
                mainScrollable ? "h-dvh overflow-hidden" : "",
              )}
            >
              {headerSlot ? headerSlot : null}

              <main
                className={cn(
                  "min-w-0 flex-1",
                  mainScrollable ? "overflow-auto" : "",
                  // nice spacing
                  "py-6",
                )}
              >
                {constrainContent ? (
                  <Container size="xl" className="min-w-0">
                    {children}
                  </Container>
                ) : (
                  <div className="px-3 md:px-6">{children}</div>
                )}
              </main>

              {/* ===== Footer ===== */}
              {footerSlot ? footerSlot : null}
            </SidebarInset>
          </div>
        </SidebarProvider>
      ) : (
        <div className="flex min-h-dvh w-full">
          {headerSlot ? headerSlot : null}

          <main
            className={cn(
              "min-w-0 flex-1",
              mainScrollable ? "overflow-auto" : "",
              // nice spacing
              "py-6",
            )}
          >
            {constrainContent ? <Container className="min-w-0">{children}</Container> : <div className="px-3 md:px-6">{children}</div>}
          </main>

          {footerSlot ? footerSlot : null}
        </div>
      )}
    </div>
  );
}
