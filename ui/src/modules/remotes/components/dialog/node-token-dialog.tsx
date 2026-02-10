import { useDialog } from '@/components/compound/dialogs';
import { TokenSection } from './token-section';
import { InstallationTabs } from './install-tabs';
import { Icon, Stack } from '@/components/foundations';
import { Button } from '@/components/ui';

export type NodeTokenDialogProps = {
  name: string;
  token?: string;
  tokenExpiresIn?: string;
  serverUrl?: string;
  showInstallInstructions?: boolean;
};

export function NodeTokenDialog({ name, token, tokenExpiresIn, serverUrl, showInstallInstructions }: NodeTokenDialogProps): Promise<void> {
  const dialog = useDialog();

  return dialog.custom<void>({
    title: 'Connect your node',
    description: `Node "${name}" has been created successfully. Follow the instructions below to connect your node to the platform.`,
    size: 'xl',
    closeOnOverlayClick: false,
    closeOnEsc: true,
    dialogFooter: (
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
        <div className='flex items-center justify-between pt-3 border-t border-border'>
          <p className='text-xs text-muted-foreground'>The token will be securely stored on the node after successful connection.</p>
          <Button variant='ghost' size='sm' leadingIcon='refresh'>
            Regenerate token
          </Button>
          <Button size='sm'>Close</Button>
        </div>
      </div>
    ),
    render: function (): React.ReactNode {
      return (
        <div className='w-full p-6'>
          <Stack gap={6}>
            {token ? (
              <>
                <TokenSection token={token} expiresIn={tokenExpiresIn} />

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
