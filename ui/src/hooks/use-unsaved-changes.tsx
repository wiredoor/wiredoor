import * as React from 'react';
import { useBlocker } from 'react-router-dom';

type Options = { message?: string };

export function useUnsavedChanges(when: boolean, options: Options = {}) {
  const message = options.message ?? 'You have unsaved changes. Leave anyway?';

  React.useEffect(() => {
    if (!when) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return message;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when, message]);

  const blocker = useBlocker(when);

  React.useEffect(() => {
    if (blocker.state !== 'blocked') return;

    const ok = window.confirm(message);
    if (ok) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);
}
