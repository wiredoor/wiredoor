import * as React from "react";

export type DialogSize = "sm" | "md" | "lg" | "xl";

export type DialogActionVariant = "default" | "secondary" | "ghost" | "destructive";

export type DialogAction = {
  id?: string;
  label: string;
  variant?: DialogActionVariant;
  autoFocus?: boolean;

  /**
   * If true, clicking closes the dialog automatically after handler (default true)
   */
  closeOnClick?: boolean;

  /**
   * Optional: allow action while busy/submitting
   */
  allowWhileBusy?: boolean;

  /**
   * Return value becomes the Promise resolve value (unless closeOnClick=false)
   */
  onClick?: (ctx: { close: (value?: any) => void; dismiss: () => void }) => any | Promise<any>;
};

export type CustomSpec<TResult = any> = CommonSpec & {
  type: "custom";

  /**
   * Render ANY content (info panels, code blocks, tables, etc.)
   */
  render: (ctx: { close: (value?: TResult) => void; dismiss: () => void; setBusy: (busy: boolean) => void; busy: boolean }) => React.ReactNode;

  /**
   * Footer actions (buttons). If omitted, host can show a default "Close".
   */
  actions?: DialogAction[];

  /**
   * If true, host shows default footer with a Close button when no actions are provided.
   */
  defaultCloseAction?: boolean; // default true
};

type CommonSpec = {
  id?: string;
  title: string;
  description?: string;
  size?: DialogSize;

  /**
   * Defaults: confirm=false (safer), alert=true
   */
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;

  /**
   * If true, user can't dismiss via overlay/esc while busy (e.g. form submit).
   */
  preventCloseWhileBusy?: boolean;
};

export type AlertSpec = CommonSpec & {
  type: "alert";
  actionText?: string; // default: "OK"
};

export type ConfirmSpec = CommonSpec & {
  type: "confirm";
  confirmText?: string; // default: "Confirm"
  cancelText?: string; // default: "Cancel"
  destructive?: boolean;
};

export type FormSpec<TValues extends Record<string, any>> = CommonSpec & {
  type: "form";
  cancelText?: string; // default: "Cancel"
  submitText?: string; // default: "Submit"

  /**
   * Optional: used by host to warn on closing when dirty.
   */
  confirmCloseIfDirty?: boolean; // default: true

  /**
   * Zod schema (optional but recommended).
   * Keep `any` here to avoid forcing zod dependency in this file.
   * The host will interpret it.
   */
  schema?: any;
  defaultValues: TValues;

  /**
   * The host provides `form` and expects JSX fields.
   */
  render: (ctx: { form: any }) => React.ReactNode;

  /**
   * Called on submit. If resolves, dialog closes.
   */
  onSubmit: (values: TValues) => Promise<void> | void;
};

export type DialogSpec = AlertSpec | ConfirmSpec | FormSpec<Record<string, any>> | CustomSpec<any>;

type DialogState = {
  current: DialogSpec | null;
  busy: boolean;
};

type Listener = () => void;

let state: DialogState = { current: null, busy: false };
const listeners = new Set<Listener>();

type Resolver = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

let pending: Resolver | null = null;

function emit() {
  for (const l of listeners) l();
}

export const dialogStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getState(): DialogState {
    return state;
  },

  setBusy(busy: boolean) {
    if (state.busy === busy) return;
    state = { ...state, busy };
    emit();
  },

  /**
   * Low-level open. Host will render based on `spec.type`.
   */
  open<T = any>(spec: DialogSpec): Promise<T> {
    // If something is open, we dismiss it as "cancel" (safe default)
    if (state.current && pending) {
      pending.resolve(spec.type === "confirm" ? false : undefined);
      pending = null;
    }

    state = { current: { ...spec, id: spec.id ?? cryptoId() }, busy: false };
    emit();

    return new Promise<T>((resolve, reject) => {
      pending = { resolve, reject };
    });
  },

  /**
   * Called by host when user cancels/closes.
   */
  dismiss() {
    if (!state.current) return;

    const spec = state.current;

    // Default results:
    // - confirm: false
    // - alert/form: undefined
    if (pending) {
      pending.resolve(spec.type === "confirm" ? false : undefined);
      pending = null;
    }

    state = { current: null, busy: false };
    emit();
  },

  /**
   * Called by host when user confirms/accepts.
   */
  resolve(value?: any) {
    if (!state.current) return;

    if (pending) {
      pending.resolve(value);
      pending = null;
    }

    state = { current: null, busy: false };
    emit();
  },

  custom<TResult = any>(spec: Omit<CustomSpec<TResult>, "type">) {
    return dialogStore.open<TResult>({ type: "custom", ...spec } as any);
  },

  info(spec: {
    title: string;
    description?: string;
    size?: DialogSize;
    closeText?: string;
    closeOnOverlayClick?: boolean;
    closeOnEsc?: boolean;
    preventCloseWhileBusy?: boolean;
    content: React.ReactNode;
  }) {
    return dialogStore.custom<void>({
      title: spec.title,
      description: spec.description,
      size: spec.size,
      closeOnOverlayClick: spec.closeOnOverlayClick ?? true,
      closeOnEsc: spec.closeOnEsc ?? true,
      preventCloseWhileBusy: spec.preventCloseWhileBusy,
      render: () => spec.content,
      actions: [
        {
          label: spec.closeText ?? "Close",
          variant: "default",
          autoFocus: true,
        },
      ],
    });
  },

  alert(spec: Omit<AlertSpec, "type">) {
    return dialogStore.open<void>({ type: "alert", ...spec });
  },

  confirm(spec: Omit<ConfirmSpec, "type">) {
    return dialogStore.open<boolean>({ type: "confirm", ...spec });
  },

  form<TValues extends Record<string, any>>(spec: Omit<FormSpec<TValues>, "type">) {
    return dialogStore.open<void>({ type: "form", ...spec } as any);
  },
};

function cryptoId() {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `dlg_${Date.now()}_${Math.random()}`;
  } catch {
    return `dlg_${Date.now()}_${Math.random()}`;
  }
}
