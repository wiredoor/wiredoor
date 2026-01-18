import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type LogoProps = {
  className?: string;
  height?: number;
  alt?: string;
  mini?: boolean;
  sidebar?: boolean;
};

export function Logo({ className, height = 32, alt = "Wiredoor Logo", mini = false, sidebar = false }: LogoProps) {
  let isMini = mini;

  if (sidebar) {
    const sb = useSidebar();

    isMini = sb?.state === "collapsed";
  }

  return (
    <Link to="/" className={cn("flex items-center", className)}>
      <img
        src={isMini ? "/images/wiredoor-light.svg" : "/images/wiredoor-large-light.svg"}
        height={height}
        width={isMini ? 32 : 170}
        className="block dark:hidden"
        alt={`${alt} (light)`}
        loading="eager"
        decoding="async"
        draggable={false}
      />
      <img
        src={isMini ? "/images/wiredoor-dark.svg" : "/images/wiredoor-large-dark.svg"}
        height={height}
        width={isMini ? 32 : 170}
        className="hidden dark:block"
        alt={`${alt} (dark)`}
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </Link>
  );
}
