import { AppAuthLayout } from '@/app/layouts/AppAuthLayout';
import { LoginForm } from '../components/login-form';

export function LoginPage() {
  return <AppAuthLayout>
    <LoginForm />
  </AppAuthLayout>
}
