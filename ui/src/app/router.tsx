import React from 'react';
import { ActionFunction, createBrowserRouter, LoaderFunction, ShouldRevalidateFunction } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';

import { LayoutTypes } from '@/layouts/types';
import { AppAuthLayout } from '@/layouts/app-auth-layout';
import { AppRootLayout } from '../layouts/app-root-layout';
import { ProtectedRoute } from './auth/protected-route';
import { GuestRoute } from './auth/guest-route';

export type AuthGuard = 'auth' | 'guest';

export type RouteModule = {
  default: React.ComponentType;

  // metadata
  layout?: LayoutTypes;
  guards?: AuthGuard[];

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
function withGuard(element: React.ReactElement, guard: AuthGuard) {
  if (guard === 'auth') {
    return <ProtectedRoute>{element}</ProtectedRoute>;
  }
  if (guard === 'guest') {
    return <GuestRoute>{element}</GuestRoute>;
  }
  return element;
}

/**
 * Wrap element with layout
 */
function withLayout(element: React.ReactElement, layout: LayoutTypes = 'none') {
  if (layout === 'auth') {
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
function routePage(opts: { page: React.ReactElement; layout?: LayoutTypes; guards?: AuthGuard[] }) {
  const { page, guards = [], layout = 'none' } = opts;

  const wrapped = withLayout(page, layout);

  return guards.reduce((acc, guard) => withGuard(acc, guard), wrapped);
}

export const convert = (queryClient: QueryClient) => async (m: RouteModule) => {
  const { default: Component, layout, guards, clientLoader, clientAction, ErrorBoundary, handle, shouldRevalidate } = m;

  return {
    handle,
    shouldRevalidate,
    loader: clientLoader?.(queryClient),
    action: clientAction?.(queryClient),

    Component: () => routePage({ page: <Component />, layout, guards }),

    ErrorBoundary,
  };
};

export const createAppRouter = (queryClient: QueryClient, opts?: { basename: string }) =>
  createBrowserRouter(
    [
      {
        path: '/login',
        lazy: () => import('@/modules/auth/login-page').then(convert(queryClient)),
      },
      {
        path: '/setup',
        lazy: () => import('@/modules/auth/setup-page').then(convert(queryClient)),
      },
      {
        path: '/',
        element: routePage({ page: <AppRootLayout />, layout: 'none', guards: ['auth'] }),
        children: [
          {
            index: true,
            lazy: () => import('@/modules/home/home-page').then(convert(queryClient)),
          },
          {
            path: 'services/http',
            lazy: () => import('@/modules/services/http/http-services-page').then(convert(queryClient)),
          },
          {
            path: 'services/http/new',
            lazy: () => import('@/modules/services/http/http-form-page').then(convert(queryClient)),
          },
          {
            path: 'services/http/edit/:id',
            lazy: () => import('@/modules/services/http/http-form-page').then(convert(queryClient)),
          },
          {
            path: 'services/tcp',
            lazy: () => import('@/modules/services/tcp/tcp-services-page').then(convert(queryClient)),
          },
          {
            path: 'nodes',
            lazy: () => import('@/modules/nodes/nodes-page').then(convert(queryClient)),
          },
          {
            path: 'nodes/new',
            lazy: () => import('@/modules/nodes/form-page').then(convert(queryClient)),
          },
          {
            path: 'nodes/edit/:id',
            lazy: () => import('@/modules/nodes/form-page').then(convert(queryClient)),
          },
          {
            path: 'settings',
            lazy: () => import('@/modules/settings/settings-page').then(convert(queryClient)),
          },
        ],
      },
      {
        path: '*',
        lazy: () => import('@/modules/shared/not-found-error-page').then(convert(queryClient)),
      },
    ],
    { basename: opts?.basename },
  );
