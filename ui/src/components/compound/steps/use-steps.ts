import * as React from 'react';

export type StepId = string;

export type StepDef = {
  id: StepId;
  title: string;
  description?: string;
  optional?: boolean;
};

export type StepsGuardContext = {
  fromIndex: number;
  toIndex: number;
  fromId: StepId;
  toId: StepId;
};

export type UseStepsOptions = {
  steps: StepDef[];
  initialStepId?: StepId;

  /** called before moving forward; return false to block */
  beforeNext?: (ctx: StepsGuardContext) => boolean | Promise<boolean>;

  /** called before moving backward; return false to block */
  beforeBack?: (ctx: StepsGuardContext) => boolean | Promise<boolean>;

  /** allow jumping to any step (click step) */
  allowJump?: boolean;

  /** called before jumping; can block */
  beforeJump?: (ctx: StepsGuardContext) => boolean | Promise<boolean>;
};

export function useSteps(opts: UseStepsOptions) {
  const { steps } = opts;

  const initialIndex = React.useMemo(() => {
    if (!opts.initialStepId) return 0;
    const idx = steps.findIndex((s) => s.id === opts.initialStepId);
    return idx >= 0 ? idx : 0;
  }, [opts.initialStepId, steps]);

  const [index, setIndex] = React.useState(initialIndex);
  const [busy, setBusy] = React.useState(false);
  const prevIndexRef = React.useRef(index);

  const current = steps[index];
  const prevIndex = prevIndexRef.current;
  const direction: 'forward' | 'back' = index >= prevIndex ? 'forward' : 'back';

  React.useEffect(() => {
    prevIndexRef.current = index;
  }, [index]);

  function ctx(toIndex: number): StepsGuardContext {
    return {
      fromIndex: index,
      toIndex,
      fromId: steps[index]?.id ?? 'unknown',
      toId: steps[toIndex]?.id ?? 'unknown',
    };
  }

  const canBack = index > 0;
  const canNext = index < steps.length - 1;

  async function goTo(toIndex: number) {
    if (toIndex < 0 || toIndex >= steps.length) return;
    if (toIndex === index) return;

    if (!opts.allowJump && Math.abs(toIndex - index) > 1) return;

    const guard = Math.abs(toIndex - index) > 1 ? opts.beforeJump : undefined;
    if (guard) {
      setBusy(true);
      try {
        const ok = await guard(ctx(toIndex));
        if (!ok) return;
        setIndex(toIndex);
      } finally {
        setBusy(false);
      }
      return;
    }

    setIndex(toIndex);
  }

  async function next() {
    if (!canNext || busy) return;
    const toIndex = index + 1;
    if (opts.beforeNext) {
      setBusy(true);
      try {
        const ok = await opts.beforeNext(ctx(toIndex));
        if (!ok) return;
        setIndex(toIndex);
      } finally {
        setBusy(false);
      }
      return;
    }
    setIndex(toIndex);
  }

  async function back() {
    if (!canBack || busy) return;
    const toIndex = index - 1;
    if (opts.beforeBack) {
      setBusy(true);
      try {
        const ok = await opts.beforeBack(ctx(toIndex));
        if (!ok) return;
        setIndex(toIndex);
      } finally {
        setBusy(false);
      }
      return;
    }
    setIndex(toIndex);
  }

  return {
    steps,
    index,
    current,
    canBack,
    canNext,
    busy,
    direction,
    setIndex: goTo,
    next,
    back,
  };
}
