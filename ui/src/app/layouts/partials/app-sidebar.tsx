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
    'relative h-10',
    'hover:bg-primary/10',
    'active:bg-primary/40 active:text-primary',
    'data-[state=open]:hover:bg-primary/10 data-[state=open]:hover:text-primary',
    'data-[active=true]:bg-primary/20 data-[active=true]:text-primary font-semibold transition-colors',
    'data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:-translate-y-1/2 data-[active=true]:font-semibold',
    'data-[active=true]:before:h-6 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary',
  );

  const subButtonClass = cn(
    'relative h-9',
    'hover:bg-primary/10',
    'active:bg-primary/40 active:text-primary',
    'data-[state=open]:hover:bg-primary/10 data-[state=open]:hover:text-primary',
    'data-[active=true]:bg-primary/20 data-[active=true]:text-primary font-semibold transition-colors',
    'data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:-translate-y-1/2 data-[active=true]:font-semibold',
    'data-[active=true]:before:h-6 data-[active=true]:before:w-[2px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary/80',
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

            const parentActive = isItemActive(item, activePath, activeMatchMode);

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
                        className={topLevelButtonClass}
                      >
                        {item.icon ? <span className='mr-2 inline-flex'>{item.icon}</span> : null}
                        <span className='truncate'>{item.label}</span>
                        <ChevronRight className='ml-auto h-4 w-4 opacity-70' />
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
                            className={cn(childActive && 'bg-sidebar text-foreground')}
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
                      data-active={parentActive ? 'true' : 'false'} // ✅ parent active
                      className={cn(topLevelButtonClass, 'gap-2')}
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
                      {item.icon ? <span className='mr-2 inline-flex'>{item.icon}</span> : null}
                      <span className='truncate'>{item.label}</span>

                      <ChevronRight
                        className={cn(
                          'ml-auto h-4 w-4 opacity-70 transition-transform duration-200',
                          'group-data-[state=open]/collapsible:rotate-90',
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub className='px-0 mx-2'>
                      {item.children!.map((child) => {
                        const childActive = !!activePath && !!child.href ? isPathActive(child.href, activePath, activeMatchMode) : false;

                        return (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton asChild data-active={childActive ? 'true' : 'false'} className={subButtonClass}>
                              <Link to={child.href ?? '#'} aria-disabled={child.disabled}>
                                {child.icon ? <span className='inline-flex'>{child.icon}</span> : null}
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
