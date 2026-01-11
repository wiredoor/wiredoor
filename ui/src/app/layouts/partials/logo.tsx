import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  height?: number;
  alt?: string;
  mini?: boolean;
};

export function Logo({
  className,
  height = 32,
  alt = "Wiredoor Logo",
  mini = false,
}: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={mini ? '/images/wiredoor-light.svg' : '/images/wiredoor-large-light.svg'}
        height={height}
        className="block dark:hidden"
        alt={`${alt} (light)`}
        loading="eager"
        decoding="async"
        draggable={false}
      />
      <img
        src={mini ? '/images/wiredoor-dark.svg' : '/images/wiredoor-large-dark.svg'}
        height={height}
        className="hidden dark:block"
        alt={`${alt} (dark)`}
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}