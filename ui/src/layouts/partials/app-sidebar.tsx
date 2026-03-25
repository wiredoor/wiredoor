import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import type { NavItem } from './types';
import { isPathActive } from './utils';

export type SidebarProps = {
  brand?: React.ReactNode;
  navItems: NavItem[];
  activePath?: string;
  activeMatchMode?: 'exact' | 'prefix';
  sidebarFooterSlot?: React.ReactNode;
  accordion?: boolean;
};

function firstEnabledChildHref(item: NavItem) {
  return item.children?.find((c) => !!c.href && !c.disabled)?.href;
}

function isChildActive(item: NavItem, activePath?: string, mode?: 'exact' | 'prefix') {
  if (!activePath) return false;
  return item.children?.some((c) => c.href && isPathActive(c.href, activePath, mode)) ?? false;
}

function isItemActive(item: NavItem, activePath?: string, mode?: 'exact' | 'prefix') {
  if (!activePath) return false;

  const selfActive = item.href ? isPathActive(item.href, activePath, mode) : false;
  const childActive = isChildActive(item, activePath, mode);
  return selfActive || childActive;
}

export function AppSidebar({ brand, navItems, activeMatchMode = 'prefix', sidebarFooterSlot, accordion = true }: SidebarProps) {
  const navigate = useNavigate();
  const sidebar = useSidebar();
  const location = useLocation();
  const activePath = location.pathname;

  const isCollapsed = sidebar?.state === 'collapsed';

  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!activePath) return;

    setOpenMap((prev) => {
      const next = { ...prev };
      for (const item of navItems) {
        if (!item.children?.length) continue;
        if (isChildActive(item, activePath, activeMatchMode)) {
          next[item.id] = true;
        }
      }
      return next;
    });
  }, [activePath, activeMatchMode, navItems]);

  function setOpen(id: string, open: boolean) {
    setOpenMap((prev) => {
      if (!accordion) return { ...prev, [id]: open };

      const next: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) next[key] = false;
      next[id] = open;
      return next;
    });
  }

  const topLevelButtonClass = cn(
    'relative h-10 gap-2 rounded-md text-sidebar-foreground',
    'hover:bg-black/5 hover:text-foreground dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground',
    'active:bg-black/8 active:text-foreground dark:active:bg-sidebar-accent dark:active:text-sidebar-accent-foreground',
    'data-[state=open]:hover:bg-black/5 data-[state=open]:hover:text-foreground dark:data-[state=open]:hover:bg-sidebar-accent dark:data-[state=open]:hover:text-sidebar-accent-foreground',
    'data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:font-medium dark:data-[active=true]:bg-sidebar-accent dark:data-[active=true]:text-sidebar-accent-foreground',
    'transition-colors',
  );

  const subButtonClass = cn(
    'h-8 gap-2 rounded-md px-2.5 text-sidebar-foreground',
    'hover:bg-black/5 hover:text-foreground dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground',
    'active:bg-black/8 active:text-foreground dark:active:bg-sidebar-accent dark:active:text-sidebar-accent-foreground',
    'data-[state=open]:hover:bg-black/5 data-[state=open]:hover:text-foreground dark:data-[state=open]:hover:bg-sidebar-accent dark:data-[state=open]:hover:text-sidebar-accent-foreground',
    'data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:font-medium dark:data-[active=true]:bg-sidebar-accent dark:data-[active=true]:text-sidebar-accent-foreground',
    'transition-colors',
  );

  return (
    <Sidebar collapsible='icon' className={cn('bg-sidebar backdrop-blur supports-backdrop-filter:bg-sidebar/50')}>
      <SidebarHeader className='gap-2 px-3 py-3'>
        <div className='flex items-center gap-2'>
          <div className='min-w-0 flex-1'>{brand}</div>
        </div>
        <Separator />
      </SidebarHeader>

      <SidebarContent className='px-2'>
        <SidebarMenu>
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const parentHasActiveChild = hasChildren && isChildActive(item, activePath, activeMatchMode);

            // For grouped items, avoid marking parent as active when a child is active.
            // This keeps a single selected entry in the visual hierarchy.
            const parentSelfActive = !!activePath && !!item.href ? isPathActive(item.href, activePath, activeMatchMode) : false;
            const parentActive = hasChildren ? parentSelfActive : isItemActive(item, activePath, activeMatchMode);

            if (!hasChildren) {
              const selfActive = !!activePath && !!item.href ? isPathActive(item.href, activePath, activeMatchMode) : false;

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    disabled={item.disabled}
                    tooltip={item.label}
                    data-active={selfActive ? 'true' : 'false'}
                    className={topLevelButtonClass}
                  >
                    <Link to={item.href ?? '#'} aria-disabled={item.disabled}>
                      {item.icon ? <span className='mr-2 inline-flex'>{item.icon}</span> : null}
                      <span className='truncate'>{item.label}</span>
                      {item.badge ? <span className='ml-auto'>{item.badge}</span> : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            const firstHref = firstEnabledChildHref(item);
            const isOpen = !!openMap[item.id];

            if (isCollapsed) {
              return (
                <SidebarMenuItem key={item.id}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.label}
                        disabled={item.disabled}
                        data-active={parentActive ? 'true' : 'false'}
                        data-has-active-child={parentHasActiveChild ? 'true' : 'false'}
                        className={cn(
                          topLevelButtonClass,
                          parentHasActiveChild && 'bg-primary/12 text-primary font-medium dark:bg-sidebar-accent dark:text-sidebar-accent-foreground',
                        )}
                      >
                        {item.icon ? (
                          <span className={cn('mr-2 inline-flex', parentHasActiveChild && 'text-primary dark:text-sidebar-accent-foreground')}>
                            {item.icon}
                          </span>
                        ) : null}
                        <span className='truncate'>{item.label}</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent side='right' align='start' className='min-w-56'>
                      {item.children!.map((child) => {
                        const childActive = !!activePath && !!child.href ? isPathActive(child.href, activePath, activeMatchMode) : false;

                        return (
                          <DropdownMenuItem
                            key={child.id}
                            disabled={child.disabled}
                            onSelect={(e) => {
                              e.preventDefault();
                              if (!child.href || child.disabled) return;
                              navigate(child.href);
                            }}
                            className={
                              childActive
                                ? 'bg-primary/12 text-primary font-medium dark:bg-sidebar-accent dark:text-sidebar-accent-foreground'
                                : undefined
                            }
                          >
                            {child.icon ? <span className='mr-2 inline-flex'>{child.icon}</span> : null}
                            <span className='truncate'>{child.label}</span>
                            {child.badge ? <span className='ml-auto'>{child.badge}</span> : null}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              );
            }

            return (
              <Collapsible key={item.id} open={isOpen} onOpenChange={(v) => setOpen(item.id, v)} className='group/collapsible'>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.label}
                      disabled={item.disabled}
                      data-active={parentActive ? 'true' : 'false'}
                      data-has-active-child={parentHasActiveChild ? 'true' : 'false'}
                      className={cn(
                        topLevelButtonClass,
                        parentHasActiveChild && 'bg-transparent text-foreground font-medium dark:text-sidebar-foreground',
                      )}
                      onClick={(e) => {
                        if (item.disabled) return;

                        // Toggle; if opening, navigate to first child (select it)
                        if (!isOpen) {
                          setOpen(item.id, true);
                          if (firstHref) navigate(firstHref);
                          e.preventDefault();
                          e.stopPropagation();
                        } else {
                          setOpen(item.id, false);
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    >
                      {item.icon ? (
                        <span className={cn('mr-2 inline-flex', parentHasActiveChild && 'text-primary dark:text-primary')}>{item.icon}</span>
                      ) : null}
                      <span className='truncate'>{item.label}</span>

                      <ChevronRight
                        className={cn(
                          'ml-auto h-4 w-4 transition-transform duration-200 transition-colors',
                          parentHasActiveChild ? 'text-primary opacity-90 dark:text-primary' : 'text-foreground/60 dark:text-sidebar-foreground/60',
                          'group-data-[state=open]/collapsible:rotate-90',
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub className='mx-1 my-1 border-sidebar-border/70 px-1.5'>
                      {item.children!.map((child) => {
                        const childActive = !!activePath && !!child.href ? isPathActive(child.href, activePath, activeMatchMode) : false;

                        return (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton asChild data-active={childActive ? 'true' : 'false'} className={subButtonClass}>
                              <Link to={child.href ?? '#'} aria-disabled={child.disabled}>
                                {child.icon ? <span className='mr-2 inline-flex'>{child.icon}</span> : null}
                                <span className='truncate'>{child.label}</span>
                                {child.badge ? <span className='ml-auto'>{child.badge}</span> : null}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {!isCollapsed && sidebarFooterSlot ? <SidebarFooter className='px-3 py-3'>{sidebarFooterSlot}</SidebarFooter> : null}

      <SidebarRail />
    </Sidebar>
  );
}
