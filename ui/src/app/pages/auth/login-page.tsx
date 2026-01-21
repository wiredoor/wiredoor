import { LoginForm } from "@/modules/auth/components/login-form";
import { AuthGuard } from "../../router";

export const layout = "auth";
export const guards: AuthGuard[] = ["guest"];

export default function LoginPage() {
  return <LoginForm />;
}
