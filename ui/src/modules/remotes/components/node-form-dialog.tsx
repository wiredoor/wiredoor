import { createDialog } from '@/components/compound/dialogs/create-dialog';
import type { DialogAction } from '@/components/compound/dialogs/dialog-store';

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
    title: 'Remote Node Configuration',
    description: 'Reset it from the server where Wiredoor is installed.',
    size: 'sm',
    closeOnOverlayClick: false,
    closeOnEsc: false,
    preventCloseWhileBusy: true,
    actions,
    render: () => {},
  };
});
