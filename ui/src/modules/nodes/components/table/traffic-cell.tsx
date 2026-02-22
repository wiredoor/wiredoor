import React from 'react';
import { Icon, Inline, Stack } from '@/components/foundations';
import { formatBytes } from '@/lib/format';

function TrafficLine({ id, dir, value }: { id: number; dir: 'rx' | 'tx'; value?: number }) {
  const has = !!value && value > 0;

  const prevRef = React.useRef<number>(undefined);
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    const prev = prevRef.current;

    if (value && prev && value > prev) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 650);
      return () => clearTimeout(t);
    }

    prevRef.current = value;
  }, [id, dir, value]);

  const label = dir === 'rx' ? 'RX:' : 'TX:';
  const arrowIcon = dir === 'rx' ? 'arrowDown' : 'arrowUp';

  const toneClass =
    has && pulse ? (dir === 'rx' ? 'text-emerald-600 dark:text-emerald-500' : 'text-sky-600 dark:text-sky-500') : 'text-muted-foreground';

  return (
    <Inline className={`items-center gap-2`}>
      <Icon name={arrowIcon} className={`h-3 w-3 ${toneClass}`} strokeWidth={2} />

      <span className='text-xs font-medium text-muted-foreground'>{label}</span>

      <span className='text-xs font-mono text-foreground'>{has ? formatBytes(value) : '-'}</span>
    </Inline>
  );
}

export function TrafficCell({ id, rx, tx }: { id: number; rx?: number; tx?: number }) {
  const hasAny = (!!rx && rx > 0) || (!!tx && tx > 0);

  return (
    <Stack gap={1} className={hasAny ? '' : 'text-muted-foreground'}>
      <TrafficLine id={id} dir='rx' value={rx} />
      <TrafficLine id={id} dir='tx' value={tx} />
    </Stack>
  );
}
