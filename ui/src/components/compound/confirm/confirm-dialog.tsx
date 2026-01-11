import * as React from "react";
import { cn } from "@/lib/utils";

import { Stack } from "@/components/foundations/stack";
import { Text } from "@/components/foundations/text";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export type ConfirmDialogTone = "default" | "destructive";

export type ConfirmDialogProps = {
  /** Controlled */
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Optional trigger wrapper */
  trigger?: React.ReactNode;

  title: string;
  description?: string;

  tone?: ConfirmDialogTone;

  /** Buttons */
  confirmText?: string;
  cancelText?: string;

  /** If true, confirm button shows loading while awaiting onConfirm */
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;

  /** Disable closing while confirming */
  lockWhileConfirming?: boolean;

  /**
   * Optional typed confirmation.
   * Example: requireText="DELETE"
   */
  requireText?: string;
  requireTextLabel?: string;
  requireTextPlaceholder?: string;

  /** Extra body content */
  children?: React.ReactNode;

  /** Fine control */
  confirmDisabled?: boolean;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  cancelVariant?: React.ComponentProps<typeof Button>["variant"];
};

export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  tone = "default",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  lockWhileConfirming = true,
  requireText,
  requireTextLabel,
  requireTextPlaceholder,
  children,
  confirmDisabled,
  confirmVariant,
  cancelVariant = "outline",
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  const needsType = Boolean(requireText && requireText.length > 0);
  const typedOk = !needsType || typed.trim() === requireText;

  const isConfirmDisabled = Boolean(confirmDisabled) || loading || !typedOk;

  const finalConfirmVariant: React.ComponentProps<typeof Button>["variant"] =
    confirmVariant ?? (tone === "destructive" ? "destructive" : "default");

  async function handleConfirm() {
    try {
      setLoading(true);
      await onConfirm();
      // Close only if confirm succeeds
      onOpenChange(false);
      setTyped("");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (loading && lockWhileConfirming) return;
    onCancel?.();
    onOpenChange(false);
    setTyped("");
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (loading && lockWhileConfirming) return;
        onOpenChange(next);
        if (!next) setTyped("");
      }}
    >
      {trigger ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : null}

      <AlertDialogContent className={cn("sm:max-w-lg")}>
        <AlertDialogHeader>
          {/* Use your typography system (Text) but keep shadcn structure for a11y */}
          <AlertDialogTitle>
            <Text as="h2" variant="h4">
              {title}
            </Text>
          </AlertDialogTitle>

          {description ? (
            <AlertDialogDescription>
              <Text variant="body-sm" tone="muted">
                {description}
              </Text>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        <Stack gap={4} className="pt-2">
          {children ? <div>{children}</div> : null}

          {needsType ? (
            <Stack gap={2}>
              <Text variant="label">
                {requireTextLabel ?? `Type "${requireText}" to confirm`}
              </Text>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requireTextPlaceholder ?? requireText}
                disabled={loading && lockWhileConfirming}
                aria-label="Confirmation text"
              />
              {!typedOk ? (
                <Text variant="caption" tone="muted">
                  Confirmation text must match exactly.
                </Text>
              ) : null}
            </Stack>
          ) : null}
        </Stack>

        <AlertDialogFooter className="pt-2">
          {/* Cancel */}
          <AlertDialogCancel asChild>
            <Button
              variant={cancelVariant}
              onClick={handleCancel}
              disabled={loading && lockWhileConfirming}
            >
              {cancelText}
            </Button>
          </AlertDialogCancel>

          {/* Confirm */}
          <AlertDialogAction asChild>
            <Button
              variant={finalConfirmVariant}
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
            >
              {loading ? "Working…" : confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
