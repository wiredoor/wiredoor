import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Inline, Stack, Surface } from "@/components/foundations";
import { Icon } from "@/components/foundations/icon";

export type SidebarFooterCTAProps = {
  repoUrl?: string;
  sponsorsUrl?: string;
  productName?: string;
};

export function SidebarFooterCTA({
  repoUrl = "https://github.com/wiredoor/wiredoor",
  sponsorsUrl = "https://github.com/sponsors/wiredoor",
  productName = "Wiredoor",
}: SidebarFooterCTAProps) {
  const sidebar = useSidebar();
  const isCollapsed = (sidebar as any)?.state === "collapsed";

  return (
    <div className="space-y-5 mb-5">
      <Surface elevation="lg" radius="lg" className={cn("p-4", isCollapsed ? "items-center text-center" : "")}>
        <Inline>
          {!isCollapsed ? (
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">Support {productName}</div>
              <div className="text-xs text-muted-foreground leading-snug">If Wiredoor helps you, give us a star or become a sponsor.</div>
            </div>
          ) : null}
        </Inline>

        <div className={cn("mt-3 flex gap-2", isCollapsed && "flex-col items-center")}>
          {/* GitHub Star */}
          <Stack>
            <a
              href={`${repoUrl}?ref=wiredoor-foss-cta`}
              target="_blank"
              rel="noreferrer"
              className={cn(isCollapsed ? "" : "w-full")}
              title="Star us on GitHub"
            >
              <Button variant="outline" size="sm" className={cn("h-8", isCollapsed ? "w-9 px-0" : "w-full justify-center")}>
                <Inline align="center">
                  <span className={cn("inline-flex items-center", isCollapsed ? "" : "gap-2")}>
                    <Icon name="star" className="text-yellow-400 fill-yellow-400" />
                    {!isCollapsed ? <span>Star on GitHub</span> : null}
                  </span>
                  {!isCollapsed ? <Icon name="external" className="opacity-50" /> : null}
                </Inline>
              </Button>
            </a>

            {/* Sponsor */}
            <a
              href={`${sponsorsUrl}?ref=wiredoor-foss-cta`}
              target="_blank"
              rel="noreferrer"
              className={cn(isCollapsed ? "" : "w-full")}
              title="Become a Sponsor"
            >
              <Button size="sm" className={cn("h-8", isCollapsed ? "w-9 px-0" : "w-full justify-center")}>
                <Inline align="center" justify="center">
                  <span className={cn("inline-flex items-center", isCollapsed ? "" : "gap-2")}>
                    <Icon name="heart" className="text-red-400 fill-red-400" />
                    {!isCollapsed ? <span>Become a Sponsor</span> : null}
                  </span>
                  {!isCollapsed ? <Icon name="external" className="opacity-50" /> : null}
                </Inline>
              </Button>
            </a>
          </Stack>
        </div>

        {!isCollapsed ? (
          <div className="mt-2 text-[11px] text-muted-foreground">Sponsors help us ship faster and keep Wiredoor open-source.</div>
        ) : null}
      </Surface>
    </div>
  );
}
