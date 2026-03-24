import { Container, ContainerSize, Inline, Text } from '@/components/foundations';
import { Icon } from '@/components/foundations/icon';
import { Button } from '@/components/ui/button';

export function Footer({ containerSize }: { containerSize?: ContainerSize }) {
  const footerContent = (
    <Inline justify='between' align='center'>
      <Inline gap={6}>
        <Text variant='body-sm'>
          <a className='hover:text-muted-foreground' href='https://www.wiredoor.net?ref=wiredoor-foss' target='_blank' rel='noopener noreferrer'>
            &copy; Wiredoor
          </a>
        </Text>
        <Text variant='body-sm'>
          <a
            className='hover:text-muted-foreground'
            href='https://github.com/wiredoor/wiredoor/blob/main/TERMS.md?ref=wiredoor-foss'
            target='_blank'
            rel='noopener noreferrer'
          >
            Terms & Conditions
          </a>
        </Text>
      </Inline>
      <Inline gap={0}>
        <Button variant='ghost' size='icon-sm' className='rounded-full' as-child='a'>
          <a href='https://reddit.com/r/wiredoor' title='Reddit' target='_blank' rel='noopener noreferrer'>
            <Icon name='reddit' />
          </a>
        </Button>
        <Button variant='ghost' size='icon-sm' className='rounded-full' as-child='a'>
          <a href='https://x.com/wiredoor_net' title='X' target='_blank' rel='noopener noreferrer'>
            <Icon name='X' />
          </a>
        </Button>
        <Button variant='ghost' size='icon-sm' className='rounded-full' as-child='a'>
          <a href='https://github.com/wiredoor/wiredoor?ref=wiredoor-foss' title='GitHub' target='_blank' rel='noopener noreferrer'>
            <Icon name='github' />
          </a>
        </Button>
      </Inline>
    </Inline>
  );

  return (
    <footer className='shrink-0'>
      {containerSize ? (
        <Container size={containerSize} className='py-4 px-4 border-t border-border/40'>
          {footerContent}
        </Container>
      ) : (
        <div>
          <div className='py-4 px-4 border-t border-border/40'>{footerContent}</div>
        </div>
      )}
    </footer>
  );
}
