import { Stack } from "@/components/foundations";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/compound/form";
import { useForm } from "@/hooks/use-form";
import { FieldValues } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "../../../lib/auth";

export function ChangePasswordForm() {
  const auth = useAuth();

  const navigate = useNavigate();

  const form = useForm<{
    password: string;
    passwordConfirm: string;
  }>({
    mode: "onSubmit",
    schema: z
      .object({
        password: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[A-Z]/, "Password must contain an uppercase letter")
          .regex(/[0-9]/, "Password must contain a number"),
        passwordConfirm: z.string().min(8, "Password must be at least 8 characters"),
      })
      .refine((data) => data.password === data.passwordConfirm, {
        message: "Passwords do not match",
        path: ["passwordConfirm"],
      }),
    onSubmit: async function (values: FieldValues): Promise<any> {
      await auth.login({
        username: values.email,
        password: values.password,
        rememberMe: values.rememberMe || false,
      });
      navigate("/");
    },
    onError: (errors) => {
      console.log("LoginForm errors:", errors);
      form.setError("root", { message: "Invalid credentials." });
    },
  });

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <Stack gap={8}>
        <PasswordField form={form} label="Password" name="password" placeholder="••••••••••••" />

        <PasswordField form={form} label="Confirm your Password" name="passwordConfirm" placeholder="••••••••••••" />

        {form.formState.errors.root?.message ? (
          <Alert
            title="Ops!"
            description={form.formState.errors.root?.message}
            variant="destructive"
            dismissible={true}
            onClose={() => form.clearErrors("root")}
            icon
          />
        ) : null}

        <Button type="submit" className="w-full" loadingText="submitting..." isLoading={form.formState.isSubmitting}>
          Continue
        </Button>
      </Stack>
    </form>
  );
}
