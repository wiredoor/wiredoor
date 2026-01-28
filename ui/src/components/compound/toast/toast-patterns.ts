import { toast, ToastOptions } from './toast';

export function toastSaved(entity = 'Changes') {
  toast.success(`${entity} saved`, {
    description: 'Your updates were applied successfully.',
  });
}

export function toastError(err: unknown, opts?: ToastOptions) {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Something went wrong';
  toast.destructive('Error', { description: message, ...opts });
}

export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading?: string;
    success?: string;
    error?: string;
    successDescription?: string;
    errorDescription?: string;
  },
) {
  const id = toast.loading(messages.loading ?? 'Working…');

  try {
    const result = await promise;
    toast.success(messages.success ?? 'Done', {
      id,
      description: messages.successDescription,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    toast.destructive(messages.error ?? 'Failed', {
      id,
      description: messages.errorDescription ?? message,
    });
    throw err;
  }
}
