import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type MiddlewareContext = {
  to: { pathname: string; search: string; hash: string };
  from?: { pathname: string; search: string; hash: string };
  navigate: ReturnType<typeof useNavigate>;
};

export type Middleware = (ctx: MiddlewareContext) => void | Promise<void>;

type GuardProps = {
  middleware?: Middleware[];
  children: React.ReactNode;
};

export function Guard({ middleware = [], children }: GuardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    (async () => {
      const ctx: MiddlewareContext = {
        to: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        navigate,
      };

      for (const mw of middleware) {
        if (cancelled) return;
        await mw(ctx);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, location.hash, navigate, middleware]);

  return <>{children}</>;
}
