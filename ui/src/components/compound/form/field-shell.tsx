import * as React from 'react';
import {
  Field,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldSeparator,
  FieldContent,
  FieldGroup,
  FieldError,
  FieldSet,
  FieldLegend,
} from '@/components/ui';
import { Inline } from '@/components/foundations';
import { ControlA11y, FieldShellProps } from './types';

function joinIds(ids: Array<string | undefined>) {
  const s = ids.filter(Boolean).join(' ');
  return s.length ? s : undefined;
}

export function FieldShell({
  className,
  id: idProp,
  title,
  label,
  helper,
  description,
  required,
  disabled = false,
  invalid = false,
  errorMessage,
  asFieldSet = false,
  legend,
  separator = false,
  children,
  render,
}: FieldShellProps) {
  const reactId = React.useId();
  const id = idProp ?? `field-${reactId}`;

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = invalid ? `${id}-error` : undefined;
  const describedBy = joinIds([descriptionId, errorId]);

  const a11y: ControlA11y = {
    id,
    disabled,
    required,
    'aria-invalid': invalid ? true : undefined,
    'aria-describedby': describedBy,
  };

  const Header = (
    <>
      {title ? <FieldTitle>{title}</FieldTitle> : null}

      {label || helper ? (
        <Inline justify='between' align='center'>
          <FieldLabel htmlFor={id}>
            {label}
            {required ? (
              <span aria-hidden='true' className='text-destructive'>
                {' '}
                *
              </span>
            ) : null}
          </FieldLabel>
          {helper ? helper : null}
        </Inline>
      ) : null}

      {separator ? <FieldSeparator /> : null}
    </>
  );

  const content = render ? render({ a11y }) : children;

  const Body = (
    <FieldContent>
      <FieldGroup>{content}</FieldGroup>
      {invalid ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
    </FieldContent>
  );

  return (
    <div className={className}>
      <Field>
        {asFieldSet ? (
          <FieldSet>
            {legend ? <FieldLegend>{legend}</FieldLegend> : null}
            {Header}
            {Body}
          </FieldSet>
        ) : (
          <>
            {Header}
            {Body}
          </>
        )}
      </Field>
    </div>
  );
}
