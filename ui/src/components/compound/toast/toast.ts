import { toast as sonnerToast } from "sonner";

export type ToastTone = "default" | "success" | "info" | "warning" | "destructive" | "loading";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastOptions = {
  id?: string | number;
  description?: string;
  duration?: number;
  important?: boolean;
  action?: ToastAction;
  cancel?: ToastAction;
};

function buildOptions(opts?: ToastOptions) {
  if (!opts) return undefined;

  return {
    id: opts.id,
    description: opts.description,
    duration: opts.duration,
    important: opts.important,
    action: opts.action ? { label: opts.action.label, onClick: opts.action.onClick } : undefined,
    cancel: opts.cancel ? { label: opts.cancel.label, onClick: opts.cancel.onClick } : undefined,
  };
}

export const toast = {
  default(title: string, opts?: ToastOptions) {
    return sonnerToast(title, buildOptions(opts));
  },
  success(title: string, opts?: ToastOptions) {
    return sonnerToast.success(title, buildOptions(opts));
  },
  info(title: string, opts?: ToastOptions) {
    return sonnerToast.message(title, buildOptions(opts));
  },
  warning(title: string, opts?: ToastOptions) {
    return sonnerToast.warning ? sonnerToast.warning(title, buildOptions(opts)) : sonnerToast(title, buildOptions(opts));
  },
  destructive(title: string, opts?: ToastOptions) {
    return sonnerToast.error(title, buildOptions(opts));
  },
  loading(title: string, opts?: ToastOptions) {
    return sonnerToast.loading(title, buildOptions(opts));
  },
  dismiss(id?: string | number) {
    return sonnerToast.dismiss(id);
  },
};
