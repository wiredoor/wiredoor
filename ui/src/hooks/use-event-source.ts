import * as React from 'react';

export type EventSourceState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

function useLatestRef<T>(value: T) {
  const ref = React.useRef(value);
  ref.current = value;
  return ref;
}

export type UseEventSourceOptions = {
  enabled?: boolean;
  key: string;
  url: () => string;

  /** cookies / session */
  withCredentials?: boolean;

  /** Logging */
  onOpen?: () => void;
  onData?: (evt: MessageEvent) => void;
  onError?: (e: any) => void;

  eventName?: string;
};

export type UseEventSourceReturn = {
  state: EventSourceState;
  lastEventId?: string;
  close: () => void;
  getEventSource: () => EventSource | null;
  urlResolved?: string;
};

export function useEventSource({
  enabled = true,
  key,
  url,
  withCredentials = true,
  onOpen,
  onData,
  onError,
  eventName,
}: UseEventSourceOptions): UseEventSourceReturn {
  const esRef = React.useRef<EventSource | null>(null);

  const urlRef = useLatestRef(url);
  const onOpenRef = useLatestRef(onOpen);
  const onDataRef = useLatestRef(onData);
  const onErrorRef = useLatestRef(onError);
  const eventNameRef = useLatestRef(eventName);

  const [state, setState] = React.useState<EventSourceState>(enabled ? 'connecting' : 'idle');
  const [lastEventId, setLastEventId] = React.useState<string | undefined>(undefined);
  const [urlResolved, setUrlResolved] = React.useState<string | undefined>(undefined);

  const getEventSource = React.useCallback(() => esRef.current, []);

  const close = React.useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setState('closed');
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      close();
      return;
    }

    close();
    setState('connecting');

    const resolved = urlRef.current();
    setUrlResolved(resolved);

    const es = new EventSource(resolved, { withCredentials });
    esRef.current = es;

    es.onopen = () => {
      setState('open');
      onOpenRef.current?.();
    };

    es.onerror = (e) => {
      setState('error');
      onErrorRef.current?.(e);
      // Optionally, you might want to close the connection on error
      // es.close();
      // Browser will automatically try to reconnect
      // controlled reconnection logic can be added here if needed
    };

    const handler = (evt: MessageEvent) => {
      // lastEventId existe en algunos browsers / servers
      const anyEvt = evt as any;
      if (anyEvt?.lastEventId) setLastEventId(anyEvt.lastEventId);
      onDataRef.current?.(evt);
    };

    es.addEventListener(eventNameRef.current ?? 'message', handler);

    return () => {
      close();
    };
  }, [enabled, key, withCredentials, close, getEventSource, urlRef, onOpenRef, onDataRef, onErrorRef, eventNameRef]);

  return { state, lastEventId, close, getEventSource, urlResolved };
}
