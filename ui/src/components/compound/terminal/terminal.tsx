import * as React from 'react';

import { cn } from '@/lib/utils';
import { Container, Surface, Text, Inline, Stack, Icon } from '@/components/foundations';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { motion } from 'motion/react';

export type TerminalCommand = {
  command: string;
  flags?: string[];
  results?: string[];
  copy?: boolean;

  /** NEW: if true, command will type instead of fade-in */
  typing?: boolean;

  /** NEW: if true, results will type line by line */
  typingResults?: boolean;
};

export type TerminalProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  entries: TerminalCommand[];

  /** ms between commands reveal */
  delay?: number;

  /** if set, replays every entries.length * delay + interval */
  interval?: number;

  /** Footer left text (like Stripe “Sign in…”) */
  footerLeft?: React.ReactNode;

  /** Footer right CTA */
  footerCtaText?: string;
  footerCtaHref?: string;
  onFooterCtaClick?: () => void;

  /** Body max height for scroll */
  bodyMaxHeightClassName?: string;

  /** show top window dots */
  showWindowDots?: boolean;

  /** on copy callback */
  onCopy?: (index: number) => void;

  /** NEW: reveal animation style */
  reveal?: 'fade' | 'slide';

  /** NEW: typing speed in ms per character */
  typingSpeed?: number;

  /** NEW: if true, replay restarts when entries changes */
  replayOnEntriesChange?: boolean;
};

type VisibleState = { showCopyCheck: boolean };

function useTypingText(text: string, started: boolean, speedMs: number) {
  const [displayed, setDisplayed] = React.useState('');

  React.useEffect(() => {
    if (!started) return;
    let i = 0;
    setDisplayed('');

    const t = window.setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) window.clearInterval(t);
    }, speedMs);

    return () => window.clearInterval(t);
  }, [text, started, speedMs]);

  return displayed;
}

function TerminalResultLine({
  line,
  isVisible,
  typingResults,
  typingSpeed,
  index,
}: {
  line: string;
  isVisible: boolean;
  typingResults?: boolean;
  typingSpeed: number;
  index: number;
}) {
  const startLine = isVisible && !!typingResults;
  const typedLine = useTypingText(line, startLine, Math.max(10, typingSpeed - 6));

  return (
    <motion.div
      initial={{ opacity: 0, y: -3 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -3 }}
      transition={{ duration: 0.2, delay: 0.02 * index }}
      className='text-white/55'
    >
      {typingResults ? typedLine : line}
    </motion.div>
  );
}

function TerminalEntry({
  cmd,
  idx,
  isVisible,
  showCheck,
  typingSpeed,
  baseInitial,
  baseAnimate,
  copyCommand,
}: {
  cmd: TerminalCommand;
  idx: number;
  isVisible: boolean;
  showCheck: boolean;
  typingSpeed: number;
  baseInitial: any;
  baseAnimate: any;
  copyCommand: (index: number) => void;
}) {
  const typedCommand = useTypingText(cmd.command, isVisible && !!cmd.typing, typingSpeed);

  return (
    <motion.div
      initial={baseInitial}
      animate={isVisible ? baseAnimate : baseInitial}
      transition={{ duration: 0.25, delay: 0 }}
      className={cn('group')}
    >
      <div className='flex items-start gap-2'>
        <span className='select-none text-white/35'>$</span>

        <div className='min-w-0 flex-1'>
          <span className='block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-white/92'>
            {cmd.typing ? typedCommand : cmd.command}
          </span>

          {(cmd.flags ?? []).map((f, k) => {
            const canShowFlag = !cmd.typing || typedCommand.length >= cmd.command.length;
            return (
              <span
                key={k}
                className={cn('inline min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-white/75', canShowFlag ? 'inline' : 'hidden')}
              >
                {' '}
                {f}
              </span>
            );
          })}
        </div>

        {cmd.copy ? (
          <div className='shrink-0'>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type='button'
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => copyCommand(idx)}
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-md',
                    'text-white/70 hover:text-white',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'focus:opacity-100 focus:outline-none',
                  )}
                  aria-label='Copy command'
                >
                  <Icon name={showCheck ? 'copyCheck' : 'copy'} className={cn(showCheck ? 'text-success' : 'text-white/70')} />
                </button>
              </TooltipTrigger>
              <TooltipContent side='top'>
                <span className='text-xs'>{showCheck ? 'Copied!' : 'Copy'}</span>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>

      {(cmd.results ?? []).length ? (
        <div className='mt-2 space-y-1 pl-4'>
          {(cmd.results ?? []).map((line, r) => (
            <TerminalResultLine key={r} line={line} isVisible={isVisible} typingResults={cmd.typingResults} typingSpeed={typingSpeed} index={r} />
          ))}
        </div>
      ) : null}

      <div className='h-4' />
    </motion.div>
  );
}

export function Terminal({
  title,
  entries,
  delay = 700,
  interval,
  footerLeft,
  footerCtaText,
  footerCtaHref,
  onFooterCtaClick,
  bodyMaxHeightClassName = 'max-h-[220px] sm:max-h-[260px] lg:max-h-[300px]',
  showWindowDots = true,
  onCopy,
  reveal = 'fade',
  typingSpeed = 22,
  replayOnEntriesChange = true,
  className,
  ...props
}: TerminalProps) {
  const [revealIndex, setRevealIndex] = React.useState(-1);

  const [state, setState] = React.useState<VisibleState[]>(() => entries.map(() => ({ showCopyCheck: false })));

  const timers = React.useRef<number[]>([]);
  const intervalTimer = React.useRef<number | null>(null);

  const clearAllTimers = React.useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    if (intervalTimer.current) {
      window.clearInterval(intervalTimer.current);
      intervalTimer.current = null;
    }
  }, []);

  const replay = React.useCallback(() => {
    clearAllTimers();
    setRevealIndex(-1);
    setState(entries.map(() => ({ showCopyCheck: false })));

    entries.forEach((_, i) => {
      const t = window.setTimeout(() => setRevealIndex(i), i * delay);
      timers.current.push(t);
    });

    if (interval != null) {
      const total = entries.length * delay + interval;
      intervalTimer.current = window.setInterval(() => replay(), total);
    }
  }, [clearAllTimers, delay, entries, interval]);

  React.useEffect(
    () => {
      replay();
      return () => clearAllTimers();
    },
    replayOnEntriesChange ? [replay, clearAllTimers] : [clearAllTimers],
  );

  const copyCommand = async (index: number) => {
    const cmd = entries[index];
    if (!cmd) return;

    const full = [cmd.command, ...(cmd.flags ?? [])].filter(Boolean).join(' ');

    try {
      await navigator.clipboard.writeText(full);

      setState((prev) => {
        const next = prev.slice();
        if (!next[index]) return prev;
        next[index] = { ...next[index], showCopyCheck: true };
        return next;
      });

      onCopy?.(index);

      window.setTimeout(() => {
        setState((prev) => {
          const next = prev.slice();
          if (!next[index]) return prev;
          next[index] = { ...next[index], showCopyCheck: false };
          return next;
        });
      }, 1500);
    } catch (e) {
      console.error('Clipboard error:', e);
    }
  };

  const baseInitial = reveal === 'fade' ? { opacity: 0 } : { opacity: 0, y: -6 };

  const baseAnimate = reveal === 'fade' ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <TooltipProvider delayDuration={120}>
      <Container size='lg' className={cn('w-full', className)} {...props}>
        <Surface
          variant='default'
          elevation='sm'
          radius='xl'
          className={cn('relative overflow-hidden', 'bg-neutral-950 text-neutral-100', 'ring-1 ring-inset ring-white/10')}
        >
          <div className='pointer-events-none absolute -inset-px opacity-45 [background:radial-gradient(900px_circle_at_20%_-10%,rgba(99,102,241,0.35),transparent_45%),radial-gradient(700px_circle_at_80%_0%,rgba(56,189,248,0.22),transparent_52%)]' />

          {/* Header */}
          <div className='relative flex items-center justify-between px-4 sm:px-5 pt-4'>
            <Inline gap={3} align='center' className='min-w-0'>
              {showWindowDots ? (
                <Inline gap={2} align='center' className='shrink-0'>
                  <span className='h-2.5 w-2.5 rounded-full bg-white/20' />
                  <span className='h-2.5 w-2.5 rounded-full bg-white/20' />
                  <span className='h-2.5 w-2.5 rounded-full bg-white/20' />
                </Inline>
              ) : null}

              <Text variant='label' className='truncate text-white/90'>
                {title}
              </Text>
            </Inline>

            <div className='h-6 w-6' />
          </div>

          {/* Body */}
          <div className='relative px-4 sm:px-5 pb-4 pt-4'>
            <div
              className={cn(
                'overflow-y-auto overflow-x-hidden pr-2',
                bodyMaxHeightClassName,
                '[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.18)_transparent]',
              )}
            >
              <Stack gap={0} className='font-mono text-[12px] sm:text-[13px] leading-6'>
                {entries.map((cmd, idx) => {
                  const isVisible = idx <= revealIndex;
                  const showCheck = !!state[idx]?.showCopyCheck;

                  return (
                    <TerminalEntry
                      key={idx}
                      cmd={cmd}
                      idx={idx}
                      isVisible={isVisible}
                      showCheck={showCheck}
                      typingSpeed={typingSpeed}
                      baseInitial={baseInitial}
                      baseAnimate={baseAnimate}
                      copyCommand={copyCommand}
                    />
                  );
                })}
              </Stack>
            </div>
          </div>

          {(footerLeft || footerCtaText) && (
            <div className='relative border-t border-white/10 px-4 sm:px-5 py-3'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='text-xs text-white/60'>{footerLeft}</div>

                {footerCtaText ? (
                  footerCtaHref ? (
                    <a
                      href={footerCtaHref}
                      className={cn(
                        'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5',
                        'text-xs font-medium text-white/90',
                        'bg-white/10 hover:bg-white/15 transition-colors',
                        'ring-1 ring-inset ring-white/10',
                      )}
                    >
                      <Icon name='download' />
                      {footerCtaText}
                    </a>
                  ) : (
                    <button
                      type='button'
                      onClick={onFooterCtaClick}
                      className={cn(
                        'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5',
                        'text-xs font-medium text-white/90',
                        'bg-white/10 hover:bg-white/15 transition-colors',
                        'ring-1 ring-inset ring-white/10',
                      )}
                    >
                      <Icon name='download' />
                      {footerCtaText}
                    </button>
                  )
                ) : null}
              </div>
            </div>
          )}
        </Surface>
      </Container>
    </TooltipProvider>
  );
}
