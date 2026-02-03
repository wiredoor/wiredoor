import * as React from 'react';
import { cn } from '@/lib/utils';
import { Stack, Inline, Text, Container, ContainerSize } from '@/components/foundations';
import { Separator } from '@/components/ui/separator';

export type PageHeaderProps = {
  container?: ContainerSize;

  eyebrow?: string;
  title: string;
  description?: string;

  actions?: React.ReactNode;

  tabs?: React.ReactNode;

  stickyTabs?: boolean;

  className?: string;
};

export function PageHeader({ container, eyebrow, title, description, actions, tabs, stickyTabs = false, className }: PageHeaderProps) {
  const header = (
    <Inline className='items-start justify-between gap-4'>
      <Stack className='gap-1 min-w-0'>
        {eyebrow ? <Text className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>{eyebrow}</Text> : null}
        <Text as='h1' variant='h3'>
          {title}
        </Text>
        {description ? (
          <Text variant='body-sm' as='p' className='mt-1 text-muted-foreground max-w-2xl'>
            {description}
          </Text>
        ) : null}
      </Stack>
      {actions ? <div className='shrink-0'>{actions}</div> : null}
    </Inline>
  );

  const tabsMenu = tabs ? (
    <div
      className={cn(
        stickyTabs ? 'sticky top-14 z-30' : '',
        stickyTabs ? 'bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60' : '',
      )}
    >
      <div className={cn(stickyTabs ? 'pt-2' : '')}>{tabs}</div>
      <div className='pt-3'>
        <Separator />
      </div>
    </div>
  ) : null;

  return (
    <Stack className={cn('gap-4', className)}>
      {container ? <Container size={container}>{header}</Container> : header}

      {tabs ? container ? <Container size={container}>{tabsMenu}</Container> : tabsMenu : <Separator />}
    </Stack>
  );
}
