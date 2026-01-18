import guest from "@/app/middlewares/guest";
import { SetupForm } from "@/modules/auth/components/setup-form";

export const layout = "auth";
export const middleware = [guest];

export default function SetupPage() {
  return <SetupForm />;
}
