import { useDialog } from '@/components/compound/dialogs';
import { TokenSection } from './token-section';
import { InstallationTabs } from './install-tabs';
import { Icon, Inline, Stack } from '@/components/foundations';
import { Button } from '@/components/ui';
import React from 'react';

export type NodeTokenDialogProps = {
  id: number;
  name: string;
  token?: string;
  serverUrl?: string;
  showInstallInstructions?: boolean;
  eventSource?: 'create' | 'regenerate';
};

export function NodeTokenDialog({ name, token, serverUrl, showInstallInstructions, eventSource = 'create' }: NodeTokenDialogProps): Promise<void> {
  const dialog = useDialog();

  return dialog.custom<void>({
    title: 'Connect your node',
    description: `Node "${name}" has been ${eventSource === 'regenerate' ? 'regenerated' : 'created'} successfully. Follow the instructions below to connect your node to the platform.`,
    size: 'xl',
    closeOnOverlayClick: false,
    closeOnEsc: true,
    dialogFooter: ({ busy, close }) => (
      <div className='w-full space-y-3'>
        {/* Next Steps */}
        <div className='flex items-start gap-2'>
          <Icon name='arrowRight' className='w-4 h-4 text-primary flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-sm font-medium text-foreground'>Next steps</p>
            <p className='text-xs text-muted-foreground mt-0.5'>After connecting, you can start exposing services through this node.</p>
          </div>
        </div>

        {/* Footer Notes */}
        <Inline className='pt-3 border-t border-border' justify='between'>
          <p className='text-xs text-muted-foreground'>The token will be securely stored on the node after successful connection.</p>
          <Inline justify='end' gap={2}>
            <Button size='sm' disabled={busy} onClick={close}>
              Close
            </Button>
          </Inline>
        </Inline>
      </div>
    ),
    render: function (): React.ReactNode {
      return (
        <div className='w-full px-6'>
          <Stack gap={6}>
            {token ? (
              <>
                <TokenSection token={token} />

                <div className='border-t border-border' />
              </>
            ) : null}

            {showInstallInstructions && <InstallationTabs className='hidden sm:block' token={token || '{YOUR_TOKEN}'} serverUrl={serverUrl} />}
          </Stack>
        </div>
      );
    },
  });
}
