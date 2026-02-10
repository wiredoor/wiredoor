import * as React from 'react';
import { cn } from '@/lib/utils';
import { Container, Stack } from '@/components/foundations';

export function PageContent({
  constrain = false,
  header,
  children,
  className,
}: {
  constrain?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const content = (
    <Stack gap={4} className={cn('py-6 min-w-0', className)}>
      {header}
      {children}
    </Stack>
  );

  if (!constrain) return content;
  return (
    <Container size='xl' className='min-w-0'>
      {content}
    </Container>
  );
}
