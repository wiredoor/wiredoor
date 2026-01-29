import * as React from 'react';

import { Stack } from '@/components/foundations';
import { Link } from '@/components/foundations/link';
import { Button } from '@/components/ui/button';
import { CheckboxRow, PasswordField, TextField } from '@/components/compound/form';
import { useForm } from '@/hooks/use-form';
import { FieldValues } from 'react-hook-form';
import Joi from 'joi';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { openForgotPasswordDialog } from './forgot-password-dialog';
import { useShake } from '@/hooks/use-shake';

export function LoginForm() {
  const auth = useAuth();
  async function forgotPassword(e: React.MouseEvent) {
    e.preventDefault();

    openForgotPasswordDialog({ username: form.getValues('email') });
  }

  const navigate = useNavigate();

  const { shake, triggerShake } = useShake();

  const form = useForm<{
    email: string;
    password: string;
    rememberMe?: boolean;
  }>({
    mode: 'onSubmit',
    schema: Joi.object({
      email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .label('Email'),
      password: Joi.string()
        .min(8)
        .pattern(new RegExp('(?=.*[A-Z])'), 'uppercase letter')
        .pattern(new RegExp('(?=.*[0-9])'), 'number')
        .required()
        .label('Password'),
      rememberMe: Joi.boolean().optional(),
    }),
    onSubmit: async function (values: FieldValues): Promise<any> {
      await auth.login({
        username: values.email,
        password: values.password,
        rememberMe: values.rememberMe || false,
      });
      navigate('/');
    },
    onError: (errors) => {
      console.log('LoginForm errors:', errors);
      form.setError('root', { message: 'Invalid credentials.' });
      triggerShake();
    },
  });

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <Stack gap={8}>
        <TextField form={form} label='Email' name='email' placeholder='you@example.com' autoFocus autoComplete='email' inputMode='email' />

        <PasswordField
          form={form}
          label='Password'
          name='password'
          placeholder='••••••••••••'
          autoComplete='current-password'
          helper={
            <Link className='font-semibold' underline={'none'} onClick={(e) => forgotPassword(e)}>
              Forgot password?
            </Link>
          }
        />

        <CheckboxRow form={form} rowLabel='Remember me on this device' name='rememberMe' labelClassName='text-sm font-medium' />

        <Button type='submit' className='w-full' shake={shake} loadingText='submitting...' isLoading={form.formState.isSubmitting}>
          Continue
        </Button>

        {form.formState.errors.root?.message ? (
          <Alert
            title='Ops!'
            description={form.formState.errors.root?.message}
            variant='destructive'
            dismissible={true}
            onClose={() => form.clearErrors('root')}
            icon
          />
        ) : null}
      </Stack>
    </form>
  );
}
