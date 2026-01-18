import guest from "@/app/middlewares/guest";
import { LoginForm } from "@/modules/auth/components/login-form";

export const layout = "auth";
export const middleware = [guest];

export default function LoginPage() {
  return <LoginForm />;
}
