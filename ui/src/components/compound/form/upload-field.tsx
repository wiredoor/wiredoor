import * as React from "react";
import type { FieldValues } from "react-hook-form";
import { X, Upload, File as FileIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { FormField } from "./form-field";
import { Button } from "@/components/ui/button";
import { FormFieldProps } from "./types";

type BaseProps<T extends FieldValues> = Omit<FormFieldProps<T>, "children"> & {
  accept?: string;
  disabled?: boolean;
  helperText?: React.ReactNode;

  /**
   * UI
   */
  triggerLabel?: React.ReactNode;
  className?: string;
  listClassName?: string;

  /**
   * If true, marks field as touched when files are selected (default: true)
   */
  touchOnSelect?: boolean;
};

export type UploadFieldProps<T extends FieldValues> =
  | (BaseProps<T> & {
      multiple?: false;
      /**
       * Value shape:
       * - default: File | null
       */
      parse?: (v: any) => File | null;
      serialize?: (f: File | null) => any;
    })
  | (BaseProps<T> & {
      multiple: true;
      parse?: (v: any) => File[];
      serialize?: (f: File[]) => any;
    });

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function UploadField<T extends FieldValues>(props: UploadFieldProps<T>) {
  const { accept, triggerLabel = "Choose file", helperText, className, listClassName, touchOnSelect = true, ...shell } = props;

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const multiple = Boolean((props as any).multiple);

  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const isDisabled = Boolean(a11y.disabled);

          const value = (() => {
            if (multiple) {
              const p = props as Extract<UploadFieldProps<T>, { multiple: true }>;
              const raw = field.value;
              return (p.parse ? p.parse(raw) : Array.isArray(raw) ? raw : []) as File[];
            } else {
              const p = props as Extract<UploadFieldProps<T>, { multiple?: false }>;
              const raw = field.value;
              return (p.parse ? p.parse(raw) : (raw ?? null)) as File | null;
            }
          })();

          const setValue = (next: File | null | File[]) => {
            if (multiple) {
              const p = props as Extract<UploadFieldProps<T>, { multiple: true }>;
              field.onChange(p.serialize ? p.serialize(next as File[]) : next);
            } else {
              const p = props as Extract<UploadFieldProps<T>, { multiple?: false }>;
              field.onChange(p.serialize ? p.serialize(next as File | null) : next);
            }
          };

          const clearNativeInput = () => {
            if (inputRef.current) inputRef.current.value = "";
          };

          const onPick = () => {
            if (isDisabled) return;
            inputRef.current?.click();
          };

          const onFilesSelected = (files: FileList | null) => {
            if (!files) return;

            if (multiple) {
              const list = Array.from(files);
              setValue(list);
            } else {
              setValue(files.item(0));
            }

            if (touchOnSelect) field.onBlur();
          };

          const removeAt = (idx: number) => {
            if (!multiple) return;

            const arr = Array.isArray(value) ? value : [];
            const next = arr.filter((_, i) => i !== idx);
            setValue(next);
            field.onBlur();
            if (next.length === 0) clearNativeInput();
          };

          const clearAll = () => {
            setValue(multiple ? [] : null);
            field.onBlur();
            clearNativeInput();
          };

          const filesArray = multiple ? (value as File[]) : value ? [value as File] : [];

          return (
            <div className={cn("grid gap-2", className)}>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                disabled={isDisabled}
                name={field.name}
                onChange={(e) => {
                  onFilesSelected(e.target.files);
                }}
                style={{ display: "none" }}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onPick}
                  disabled={isDisabled}
                  id={a11y.id}
                  aria-invalid={a11y["aria-invalid"]}
                  aria-describedby={a11y["aria-describedby"]}
                  className="gap-2"
                  leadingIcon={<Upload className="size-4 opacity-70" />}
                >
                  {triggerLabel}
                </Button>

                {filesArray.length > 0 ? (
                  <Button type="button" variant="ghost" onClick={clearAll} disabled={isDisabled} className="gap-2">
                    <X className="size-4 opacity-70" />
                    Clear
                  </Button>
                ) : null}

                <div className="ml-auto text-xs opacity-70">{helperText ?? (accept ? `Accepted: ${accept}` : null)}</div>
              </div>

              {filesArray.length > 0 ? (
                <div className={cn("grid gap-2", listClassName)}>
                  {filesArray.map((f, idx) => (
                    <div key={`${f.name}-${f.size}-${idx}`} className="bg-muted/40 border-border flex items-center gap-2 rounded-md border px-3 py-2">
                      <FileIcon className="size-4 opacity-70" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{f.name}</div>
                        <div className="text-muted-foreground text-xs">{formatBytes(f.size)}</div>
                      </div>

                      {multiple ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isDisabled}
                          onClick={() => removeAt(idx)}
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="size-4 opacity-70" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }}
      </FormField.Control>
    </FormField>
  );
}
