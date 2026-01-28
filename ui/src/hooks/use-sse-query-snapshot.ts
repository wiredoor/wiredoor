import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEventSource } from '@/hooks/use-event-source';

export function useSSEQuerySnapshot<TSnapshot>(opts: {
  enabled: boolean;
  key: string;
  url: () => string;
  queryKey: QueryKey;
  parse: (evt: MessageEvent) => TSnapshot;
  apply?: (prev: TSnapshot | undefined, next: TSnapshot) => TSnapshot;
  eventName?: string;
}) {
  const qc = useQueryClient();

  return useEventSource({
    enabled: opts.enabled,
    key: opts.key,
    url: opts.url,
    eventName: opts.eventName,
    onData: (evt) => {
      const next = opts.parse(evt);
      qc.setQueryData(opts.queryKey, (prev: unknown) => {
        const prevTyped = prev as TSnapshot | undefined;
        return opts.apply ? opts.apply(prevTyped, next) : next;
      });
    },
  });
}
