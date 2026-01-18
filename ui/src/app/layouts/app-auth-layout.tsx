import { AuthLayout } from "@/components/layouts/AuthLayout";
import { TopNav } from "./partials/top-nav";
import { Text } from "@/components/foundations";
import { Footer } from "./partials/footer";
import { Logo } from "./partials/logo";
import { ThemeToggle } from "./partials/theme-toggle";

export type AppAuthLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function AppAuthLayout({ children }: AppAuthLayoutProps) {
  return (
    <AuthLayout
      variant="centered"
      cardSize="sm"
      background="none"
      containerSize="xl"
      cardFooter={
        <Text variant="caption" tone="muted" align="center">
          By continuing you agree to our Terms & Conditions.
        </Text>
      }
      title="Sign in to your account"
      header={<TopNav brand={<Logo />} containerSize="xl" rightSlot={<ThemeToggle />} />}
      pageFooter={<Footer containerSize="xl" />}
    >
      {children}
    </AuthLayout>
  );
}
