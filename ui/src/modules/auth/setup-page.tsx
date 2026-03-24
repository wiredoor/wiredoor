import { SetupForm } from '@/modules/auth/components/setup-form';
import { AuthGuard } from '../../app/router';

export const layout = 'auth';
export const guards: AuthGuard[] = ['guest'];

export default function SetupPage() {
  return <SetupForm />;
}
