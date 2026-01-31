import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEventSource } from '@/hooks/use-event-source';

export function useSSEQuerySnapshot<TSnapshot, TData>(opts: {
  enabled: boolean;
  key: string;
  url: () => string;
  queryKey: QueryKey;

  parse: (evt: MessageEvent) => TData;

  apply?: (prev: TSnapshot | undefined, next: TData) => TSnapshot;

  onApplied?: (next: TSnapshot) => void;

  onDataParsed?: (data: TData) => void;

  eventName?: string;
}) {
  const qc = useQueryClient();

  return useEventSource({
    enabled: opts.enabled,
    key: opts.key,
    url: opts.url,
    eventName: opts.eventName,
    onData: (evt) => {
      const parsed = opts.parse(evt);
      opts.onDataParsed?.(parsed);

      qc.setQueryData(opts.queryKey, (prev: unknown) => {
        const prevTyped = prev as TSnapshot | undefined;

        const nextSnapshot = opts.apply ? opts.apply(prevTyped, parsed) : (parsed as unknown as TSnapshot);

        opts.onApplied?.(nextSnapshot);

        return nextSnapshot;
      });
    },
  });
}
