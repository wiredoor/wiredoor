import React from "react";
import { RouteObject } from "react-router-dom";

import { HomeView } from "@/app/pages/home";
import { SetupView } from "@/app/pages/auth/setup";
import { NotFoundView } from "@/app/pages/errors/not-found";

import { Guard } from "@/app/router/guard";
import auth from "@/app/router/middlewares/auth";
import guest from "@/app/router/middlewares/guest";
import { LayoutTypes } from '../layouts/types';
import { LoginPage } from '../modules/auth/pages/LoginPage';

/**
 * Wrap element with guards
 */
function withGuards(
  element: React.ReactElement,
  middleware: Array<(ctx: any) => any> = []
) {
  if (!middleware.length) return element;

  return <Guard middleware={middleware}>{element}</Guard>;
}

/**
 * Middleware + Layout helper
 */
function routePage(opts: {
  page: React.ReactElement;
  layout?: LayoutTypes;
  middleware?: Array<(ctx: any) => any>;
}) {
  const { page, middleware = [], layout = "none" } = opts;

  const wrapped =
    // layout === "app" ? <AppShell>{page}</AppShell> :
    // layout === "auth" ? <AuthShell>{page}</AuthShell> :
    page;

  return withGuards(wrapped, middleware);
}

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: routePage({
      page: <LoginPage />,
      layout: "auth",
      middleware: [guest],
    }),
  },
  {
    path: "/setup",
    element: routePage({
      page: <SetupView />,
      layout: "auth",
      middleware: [guest],
    }),
  },
  {
    path: "/",
    element: routePage({
      page: <HomeView />,
      layout: "app",
      middleware: [auth],
    }),
  },
  {
    path: "*",
    element: <NotFoundView />,
  },
];