import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/foundations/icon";

type Theme = "light" | "dark" | "system";

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") return <Icon name="moon" size={16} />;
  return <Icon name="sun" size={16} />;
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("rounded-full bg-background/40 hover:bg-muted/40", className)}
          aria-label="Toggle theme"
        >
          <ThemeIcon theme={theme} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Icon name="laptop" className="mr-2" />
          System
          {theme === "system" ? <span className="ml-auto">✓</span> : null}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Icon name="sun" className="mr-2" />
          Light
          {theme === "light" ? <span className="ml-auto">✓</span> : null}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Icon name="moon" className="mr-2" />
          Dark
          {theme === "dark" ? <span className="ml-auto">✓</span> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
