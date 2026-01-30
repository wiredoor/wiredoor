import { createDialog } from '@/components/compound/dialogs/create-dialog';
import type { DialogAction } from '@/components/compound/dialogs/dialog-store';

import { Stack, Text } from '@/components/foundations';
import { Terminal } from '@/components/compound/terminal';
// import { Terminal } from "@/components/compound/terminal";

type ForgotPasswordArgs = {
  username?: string;
  resetCommand?: string;
};

type ForgotPasswordResult = 'copied' | 'closed';

export const openForgotPasswordDialog = createDialog<ForgotPasswordArgs, ForgotPasswordResult>((args) => {
  const actions: DialogAction[] = [
    {
      label: 'Close',
      variant: 'default',
      autoFocus: true,
      onClick: () => 'closed',
    },
  ];

  return {
    title: 'Forgot your password?',
    description: 'Reset it from the server where Wiredoor is installed.',
    size: 'lg',
    closeOnOverlayClick: false,
    closeOnEsc: true,
    preventCloseWhileBusy: true,
    actions,
    render: () => (
      <Stack gap={4}>
        <Text>On the host machine, run this command to reset the password.</Text>

        <Terminal
          title='Wiredoor Administration CLI'
          delay={650}
          className='w-full'
          entries={[
            { command: 'cd', flags: ['/path/to/wiredoor-install-dir'], copy: false, typing: true },
            {
              command: 'docker compose exec wiredoor',
              flags: ['wd-admin', 'change-password', '--user', args.username || 'admin@example.com'],
              copy: true,
              results: ['New password: ********', 'Confirm password: ********', 'Password changed successfully.'],
            },
          ]}
        />
      </Stack>
    ),
  };
});
