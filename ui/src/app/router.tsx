import React from "react";
import { ActionFunction, createBrowserRouter, LoaderFunction, ShouldRevalidateFunction } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";

import { Guard, Middleware } from "@/app/middlewares/guard";
import { LayoutTypes } from "@/app/layouts/types";
import { AppAuthLayout } from "@/app/layouts/app-auth-layout";
import { AppRootLayout } from "./layouts/app-root-layout";

export type RouteModule = {
  default: React.ComponentType;

  // metadata
  layout?: LayoutTypes;
  middleware?: Middleware[];

  // data router (client-side)
  clientLoader?: (qc: QueryClient) => LoaderFunction;
  clientAction?: (qc: QueryClient) => ActionFunction;

  // react-router v6+ data routers
  ErrorBoundary?: React.ComponentType;

  handle?: any;
  shouldRevalidate?: ShouldRevalidateFunction;
  // etc...
};

/**
 * Wrap element with guards
 */
function withGuards(element: React.ReactElement, middleware: Middleware[] = []) {
  if (!middleware.length) return element;

  return <Guard middleware={middleware}>{element}</Guard>;
}

/**
 * Wrap element with layout
 */
function withLayout(element: React.ReactElement, layout: LayoutTypes = "none") {
  if (layout === "auth") {
    return <AppAuthLayout>{element}</AppAuthLayout>;
  }
  // if (layout === "app") {
  //   return <AppLayout>{element}</AppLayout>;
  // }
  return element;
}

/**
 * Middleware + Layout helper
 */
function routePage(opts: { page: React.ReactElement; layout?: LayoutTypes; middleware?: Middleware[] }) {
  const { page, middleware = [], layout = "none" } = opts;

  const wrapped = withLayout(page, layout);

  return withGuards(wrapped, middleware);
}

export const convert = (queryClient: QueryClient) => async (m: RouteModule) => {
  const { default: Component, layout, middleware, clientLoader, clientAction, ErrorBoundary, handle, shouldRevalidate } = m;

  return {
    handle,
    shouldRevalidate,
    loader: clientLoader?.(queryClient),
    action: clientAction?.(queryClient),

    Component: () => routePage({ page: <Component />, layout, middleware }),

    ErrorBoundary,
  };
};

export const createAppRouter = (queryClient: QueryClient, opts?: { basename: string }) =>
  createBrowserRouter(
    [
      {
        path: "/login",
        lazy: () => import("@/app/pages/auth/login-page").then(convert(queryClient)),
      },
      {
        path: "/setup",
        lazy: () => import("@/app/pages/auth/setup-page").then(convert(queryClient)),
      },
      {
        path: "/",
        element: <AppRootLayout />,
        children: [
          {
            index: true,
            lazy: () => import("@/app/pages/home").then(convert(queryClient)),
          },
          {
            path: "services/http",
            lazy: () => import("@/app/pages/services/http-services").then(convert(queryClient)),
          },
          {
            path: "services/tcp",
            lazy: () => import("@/app/pages/services/tcp-services").then(convert(queryClient)),
          },
          {
            path: "nodes",
            lazy: () => import("@/app/pages/nodes").then(convert(queryClient)),
          },
          {
            path: "settings",
            lazy: () => import("@/app/pages/settings/settings-page").then(convert(queryClient)),
          },
        ],
      },
      {
        path: "*",
        lazy: () => import("@/app/pages/errors/not-found").then(convert(queryClient)),
      },
    ],
    { basename: opts?.basename },
  );
