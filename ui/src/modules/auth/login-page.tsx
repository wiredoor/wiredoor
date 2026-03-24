import { LoginForm } from '@/modules/auth/components/login-form';
import { AuthGuard } from '../../app/router';

export const layout = 'auth';
export const guards: AuthGuard[] = ['guest'];

export default function LoginPage() {
  return <LoginForm />;
}
