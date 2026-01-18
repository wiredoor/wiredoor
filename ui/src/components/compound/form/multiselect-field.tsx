import * as React from "react";
import type { FieldValues } from "react-hook-form";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormFieldProps } from "./types";
import { Option } from "./combobox-field";
import { FieldButton } from "./field-button";

export type MultiSelectFieldProps<T extends FieldValues, V extends string = string> = Omit<FormFieldProps<T>, "children"> & {
  options: Array<Option<V>>;

  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;

  /**
   * Display selected options as count or chips (default "count")
   */
  display?: "count" | "chips";

  triggerClassName?: string;
  popoverClassName?: string;

  /**
   * If your form stores null/undefined instead of []
   */
  serialize?: (v: V[]) => any;
  parse?: (v: any) => V[];
};

function toggleInArray(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function MultiSelectField<T extends FieldValues, V extends string = string>({
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  display = "count",
  triggerClassName,
  popoverClassName,
  serialize,
  parse,
  ...shell
}: MultiSelectFieldProps<T, V>) {
  const [open, setOpen] = React.useState(false);

  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const raw = field.value;

          const values: V[] = parse ? parse(raw) : Array.isArray(raw) ? (raw as V[]) : [];

          const setValues = (next: V[]) => {
            const out = serialize ? serialize(next) : next;
            field.onChange(out);
          };

          const selectedOptions = options.filter((o) => values.includes(o.value));

          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FieldButton
                  id={a11y.id}
                  role="combobox"
                  aria-expanded={open}
                  disabled={a11y.disabled}
                  aria-invalid={a11y["aria-invalid"]}
                  aria-describedby={a11y["aria-describedby"]}
                  className={cn("min-w-48 justify-between", triggerClassName)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    {selectedOptions.length === 0 ? (
                      <span className="text-muted-foreground">{placeholder}</span>
                    ) : display === "count" ? (
                      <span className="truncate">{selectedOptions.length} selected</span>
                    ) : (
                      <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                        {selectedOptions.slice(0, 3).map((opt) => (
                          <span
                            key={opt.value}
                            className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                            onPointerDown={(e) => {
                              // evita abrir/cerrar el popover al click del chip
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <span className="truncate">{opt.label}</span>
                            <button
                              type="button"
                              className="opacity-70 hover:opacity-100"
                              onClick={() => {
                                setValues(values.filter((v) => v !== opt.value));
                                field.onBlur();
                              }}
                              aria-label={`Remove ${String(opt.value)}`}
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                        {selectedOptions.length > 3 ? <span className="text-muted-foreground text-xs">+{selectedOptions.length - 3}</span> : null}
                      </div>
                    )}
                  </div>

                  <ChevronsUpDown className="text-muted-foreground size-4 opacity-50" />
                </FieldButton>
              </PopoverTrigger>

              <PopoverContent className={cn("w-[240px] p-0", popoverClassName)}>
                <Command>
                  <CommandInput placeholder={searchPlaceholder} className="h-9" />
                  <CommandList>
                    <CommandEmpty>{emptyText}</CommandEmpty>

                    <CommandGroup>
                      {options.map((opt) => {
                        const selected = values.includes(opt.value);
                        return (
                          <CommandItem
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.disabled}
                            onSelect={(currentValue) => {
                              const next = toggleInArray(values as unknown as string[], currentValue) as V[];

                              setValues(next);
                              field.onBlur();
                            }}
                          >
                            {opt.label}
                            <Check className={cn("ml-auto", selected ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          );
        }}
      </FormField.Control>
    </FormField>
  );
}
