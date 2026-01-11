
import { FormField } from '@/components/compound/form/form-field';
import { Inline, Stack } from '@/components/foundations';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  return <Stack gap={8}>
    <FormField
      label="Email"
      name="email"
      render={() => <FormField.Input placeholder="you@example.com" />}
    />

    <FormField
      label="Password"
      name="password"
      render={() => <FormField.Password placeholder="••••••••••••" />}
    />

    <Inline justify="between" align="center">
      <Button variant="link">Forgot password?</Button>
      <Button>Continue</Button>
    </Inline>
  </Stack>
}