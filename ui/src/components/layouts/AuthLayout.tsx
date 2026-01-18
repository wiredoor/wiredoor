import * as React from "react";

import { cn } from "@/lib/utils";

import { Text, Stack, Inline, Container, Surface, BackgroundPreset, BackgroundLayer, ContainerSize } from "@/components/foundations";

export type AuthLayoutVariant = "centered" | "split";
export type AuthLayoutCardSize = "sm" | "default" | "lg";

export type AuthLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Brand slot (logo) */
  brand?: React.ReactNode;

  /** Controls-friendly */
  eyebrow?: string;
  title: string;
  description?: string;

  /** If you ever need JSX title (rare) */
  titleSlot?: React.ReactNode;
  descriptionSlot?: React.ReactNode;

  /** Main form/content */
  children: React.ReactNode;

  cardFooter?: React.ReactNode;

  /** Optional aside (only used in split on desktop) */
  aside?: React.ReactNode;

  /** Style controls for multi-step flows */
  stableCard?: boolean;
  cardMinHeight?: number;
  contentMaxHeight?: number;

  /** Layout behavior */
  variant?: AuthLayoutVariant;
  cardSize?: AuthLayoutCardSize;
  background?: BackgroundPreset;

  containerSize?: ContainerSize;

  header?: React.ReactNode;
  pageFooter?: React.ReactNode;
};

const cardSizes: Record<AuthLayoutCardSize, string> = {
  sm: "max-w-md",
  default: "max-w-lg",
  lg: "max-w-xl",
};

export function AuthLayout({
  className,
  brand,
  eyebrow,
  title,
  description,
  titleSlot,
  descriptionSlot,
  children,
  cardFooter,
  aside,
  stableCard = false,
  cardMinHeight = 520,
  contentMaxHeight = 400,
  variant = "centered",
  cardSize = "sm",
  background = "none",
  containerSize = "lg",
  header,
  pageFooter,
  ...props
}: AuthLayoutProps) {
  return (
    <div className={cn("min-h-screen text-foreground flex flex-col animate-fade-in", className)} {...props}>
      <BackgroundLayer background={background} />

      {header ? <header className="shrink-0">{header}</header> : null}

      <main className="flex-1">
        <Container className="py-5 md:py-10 lg:py-14" size={containerSize}>
          {variant === "split" ? (
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <AuthCard
                brand={brand}
                eyebrow={eyebrow}
                title={title}
                description={description}
                titleSlot={titleSlot}
                descriptionSlot={descriptionSlot}
                footer={cardFooter}
                stableCard={stableCard}
                cardMinHeight={cardMinHeight}
                contentMaxHeight={contentMaxHeight}
                className={cardSizes[cardSize]}
              >
                {children}
              </AuthCard>

              <div className="hidden lg:block">
                {aside ? (
                  <Surface elevation="sm" radius="lg" className="p-8">
                    {aside}
                  </Surface>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[70vh] items-center justify-center">
              <AuthCard
                brand={brand}
                eyebrow={eyebrow}
                title={title}
                description={description}
                titleSlot={titleSlot}
                descriptionSlot={descriptionSlot}
                footer={cardFooter}
                className={cardSizes[cardSize]}
              >
                {children}
              </AuthCard>
            </div>
          )}
        </Container>
      </main>

      {pageFooter ? pageFooter : null}
    </div>
  );
}

function AuthCard({
  className,
  brand,
  eyebrow,
  title,
  description,
  titleSlot,
  descriptionSlot,
  stableCard,
  cardMinHeight = 520,
  contentMaxHeight = 400,
  children,
  footer,
}: {
  className?: string;
  brand?: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  titleSlot?: React.ReactNode;
  descriptionSlot?: React.ReactNode;
  stableCard?: boolean;
  cardMinHeight?: number;
  contentMaxHeight?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className={cn("w-full", className)}>
      <Surface elevation="sm" radius="lg" className="p-6 sm:p-8 md:p-9 lg:p-12" style={stableCard ? { minHeight: cardMinHeight } : {}}>
        <Stack gap={6} className={stableCard ? "h-full" : undefined}>
          <Stack gap={3}>
            <Inline align="center" gap={3}>
              {brand ? <div className="shrink-0">{brand}</div> : null}
              <div className="min-w-0">
                {eyebrow ? (
                  <Text variant="caption" tone="muted">
                    {eyebrow}
                  </Text>
                ) : null}

                {titleSlot ? (
                  titleSlot
                ) : (
                  <Text as="h1" variant="h3">
                    {title}
                  </Text>
                )}
              </div>
            </Inline>

            {descriptionSlot ? (
              descriptionSlot
            ) : description ? (
              <Text variant="body-sm" tone="muted">
                {description}
              </Text>
            ) : null}
          </Stack>

          <div className={stableCard ? "overflow-auto" : undefined} style={stableCard ? { maxHeight: contentMaxHeight } : {}}>
            {children}
          </div>

          {footer ? <div className="border-t border-border/40 pt-4">{footer}</div> : null}
        </Stack>
      </Surface>
    </div>
  );
}
