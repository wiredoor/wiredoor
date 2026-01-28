import * as React from 'react';
import { dialogStore, type DialogSpec, type DialogSize } from './dialog-store';
import { zodResolver } from '@hookform/resolvers/zod';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Button } from '@/components/ui';
import { Stack, Text } from '@/components/foundations';

// form
import { useForm } from 'react-hook-form';

const sizeToClass: Record<DialogSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export function DialogHost() {
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    dialogStore.subscribe(force);
  }, []);

  const { current, busy } = dialogStore.getState();
  const open = Boolean(current);

  if (!current) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;

        // user tries to close
        if (!canDismiss(current, busy)) return;

        dialogStore.dismiss();
      }}
    >
      <DialogContent
        className={[sizeToClass[current.size ?? 'md'], 'p-0 overflow-hidden'].join(' ')}
        // prevent Radix from auto focusing odd things if you want; optional
        // onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          const allowEsc = current.closeOnEsc ?? defaultCloseOnEsc(current);
          if (!allowEsc || !canDismiss(current, busy)) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          const allowOverlay = current.closeOnOverlayClick ?? defaultCloseOnOverlay(current);
          if (!allowOverlay || !canDismiss(current, busy)) {
            e.preventDefault();
          }
        }}
      >
        <div className='p-6'>
          <Stack gap={4} className='m-2'>
            <DialogHeader>
              <DialogTitle>{current.title}</DialogTitle>
              {current.description ? <DialogDescription>{current.description}</DialogDescription> : null}
            </DialogHeader>

            {current.type === 'alert' ? (
              <AlertBody spec={current} busy={busy} />
            ) : current.type === 'confirm' ? (
              <ConfirmBody spec={current} busy={busy} />
            ) : current.type === 'form' ? (
              <FormBody spec={current} busy={busy} />
            ) : (
              <CustomBody spec={current} busy={busy} />
            )}
          </Stack>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function defaultCloseOnOverlay(spec: DialogSpec) {
  // safer default
  if (spec.type === 'alert') return true;
  return false;
}

function defaultCloseOnEsc(spec: DialogSpec) {
  // same policy as overlay by default
  return defaultCloseOnOverlay(spec);
}

function canDismiss(spec: DialogSpec, busy: boolean) {
  if (!busy) return true;
  return spec.preventCloseWhileBusy ? false : true;
}

/* -------------------------- CustomBody -------------------------- */

function CustomBody({ spec, busy }: { spec: Extract<DialogSpec, { type: 'custom' }>; busy: boolean }) {
  const actions = spec.actions ?? [];

  const hasActions = actions.length > 0;
  const showDefaultClose = spec.defaultCloseAction ?? !hasActions;

  return (
    <>
      <div className='max-h-[65vh] overflow-auto p-2'>
        {spec.render({
          busy,
          setBusy: (b) => dialogStore.setBusy(b),
          close: (value) => dialogStore.resolve(value),
          dismiss: () => dialogStore.dismiss(),
        })}
      </div>

      <DialogFooter className='pt-2'>
        {hasActions ? (
          <>
            {actions.map((a, idx) => {
              const disabled = busy && !a.allowWhileBusy;
              const autoFocus = a.autoFocus ?? false;

              return (
                <Button
                  key={a.id ?? `${idx}`}
                  variant={(a.variant as any) ?? 'default'}
                  disabled={disabled}
                  autoFocus={autoFocus}
                  onClick={async () => {
                    const closeOnClick = a.closeOnClick ?? true;

                    if (!a.onClick) {
                      if (closeOnClick) dialogStore.resolve();
                      return;
                    }

                    try {
                      dialogStore.setBusy(true);
                      const result = await a.onClick({
                        close: (v) => dialogStore.resolve(v),
                        dismiss: () => dialogStore.dismiss(),
                      });

                      if (closeOnClick) dialogStore.resolve(result);
                    } finally {
                      dialogStore.setBusy(false);
                    }
                  }}
                >
                  {a.label}
                </Button>
              );
            })}
          </>
        ) : null}

        {showDefaultClose ? (
          <Button variant='default' onClick={() => dialogStore.resolve()}>
            Close
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}

/* -------------------------- Alert -------------------------- */

function AlertBody({ spec }: { spec: Extract<DialogSpec, { type: 'alert' }>; busy: boolean }) {
  return (
    <>
      <DialogFooter className='pt-2'>
        <Button onClick={() => dialogStore.resolve()}>{spec.actionText ?? 'OK'}</Button>
      </DialogFooter>
    </>
  );
}

/* ------------------------- Confirm ------------------------- */

function ConfirmBody({ spec, busy }: { spec: Extract<DialogSpec, { type: 'confirm' }>; busy: boolean }) {
  return (
    <>
      <DialogFooter className='pt-2'>
        <Button variant='ghost' disabled={busy} onClick={() => dialogStore.dismiss()}>
          {spec.cancelText ?? 'Cancel'}
        </Button>

        <Button variant={spec.destructive ? 'destructive' : 'default'} disabled={busy} onClick={() => dialogStore.resolve(true)}>
          {spec.confirmText ?? 'Confirm'}
        </Button>
      </DialogFooter>
    </>
  );
}

/* -------------------------- Form --------------------------- */

function FormBody({ spec }: { spec: Extract<DialogSpec, { type: 'form' }>; busy: boolean }) {
  // Build RHF config
  const form = useForm({
    defaultValues: spec.defaultValues,
    ...(spec.schema && zodResolver ? { resolver: zodResolver(spec.schema) } : {}),
    mode: 'onSubmit',
  });

  const isDirty = form.formState.isDirty;
  const isSubmitting = form.formState.isSubmitting;

  // Keep store busy in sync (for overlay/esc prevention, disabling buttons, etc.)
  React.useEffect(() => {
    dialogStore.setBusy(isSubmitting);
  }, [isSubmitting]);

  async function requestClose() {
    if (isSubmitting && spec.preventCloseWhileBusy) return;

    const shouldGuard = spec.confirmCloseIfDirty ?? true;
    if (shouldGuard && isDirty) {
      const ok = await dialogStore.confirm({
        title: 'Discard changes?',
        description: 'You have unsaved changes. If you close now, they will be lost.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        destructive: true,
        closeOnOverlayClick: false,
        closeOnEsc: true,
      });

      if (!ok) return;
    }

    dialogStore.dismiss();
  }

  return (
    <>
      <Stack gap={4}>
        {/* Body scroll area */}
        <div className='max-h-[65vh] overflow-auto p-2'>{spec.render({ form })}</div>

        {form.formState.errors && Object.keys(form.formState.errors).length > 0 ? (
          <Text variant='body-sm' className='text-destructive'>
            Please fix the highlighted fields.
          </Text>
        ) : null}
      </Stack>

      <DialogFooter className='pt-2'>
        <Button variant='ghost' type='button' disabled={isSubmitting} onClick={requestClose}>
          {spec.cancelText ?? 'Cancel'}
        </Button>

        <Button
          type='button'
          disabled={isSubmitting}
          onClick={form.handleSubmit(async (values) => {
            try {
              dialogStore.setBusy(true);
              await spec.onSubmit(values as any);
              dialogStore.resolve();
            } finally {
              dialogStore.setBusy(false);
            }
          })}
        >
          {spec.submitText ?? 'Submit'}
        </Button>
      </DialogFooter>
    </>
  );
}
