import * as React from "react";
import { Link } from "react-router-dom";
import { BookOpen, LifeBuoy, MessageSquare, ExternalLink, Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/foundations/icon";

export type HelpMenuProps = {
  className?: string;
  docsHref?: string; // internal route OR external
  communityHref?: string;
  supportHref?: string;
  statusHref?: string;
  shortcutsOnClick?: () => void; // open command palette / shortcuts modal
};

export function HelpMenu({
  className,
  docsHref = "/docs",
  communityHref = "https://github.com/wiredoor/wiredoor",
  supportHref = "/support",
  statusHref = "https://status.wiredoor.io",
}: HelpMenuProps) {
  const isExternal = (href: string) => /^https?:\/\//i.test(href);

  const ItemLink = ({ className, href, children }: { className?: string; href: string; children: React.ReactNode }) => {
    const cl = cn(
      "flex w-full items-center",
      "hover:bg-accent hover:text-accent-foreground",
      "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    );

    return isExternal(href) ? (
      <a href={href} target="_blank" rel="noreferrer" className={cl}>
        {children}
      </a>
    ) : (
      <Link to={href} className={cl}>
        {children}
      </Link>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("rounded-full bg-background/40 hover:bg-muted/40", className)}
          aria-label="Toggle theme"
        >
          <Icon name="info" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Help</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <ItemLink href={docsHref}>
            <BookOpen className="mr-2 h-4 w-4" />
            Documentation
            {isExternal(docsHref) ? <ExternalLink className="ml-auto h-4 w-4 opacity-60" /> : null}
          </ItemLink>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <ItemLink href={communityHref}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Community
            <ExternalLink className="ml-auto h-4 w-4 opacity-60" />
          </ItemLink>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <ItemLink href={supportHref}>
            <LifeBuoy className="mr-2 h-4 w-4" />
            Support
          </ItemLink>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <ItemLink href={statusHref}>
            <Activity className="mr-2 h-4 w-4" />
            Status
            <ExternalLink className="ml-auto h-4 w-4 opacity-60" />
          </ItemLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
