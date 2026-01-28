import { cn } from '../../../lib/utils';

import { Stack } from '../../foundations/stack';
import { Inline } from '../../foundations/inline';
import { Text } from '../../foundations/text';
import { StatusDot } from '../badges';

export type StepsOrientation = 'horizontal' | 'vertical';
export type StepsStyle = 'default' | 'pills' | 'timeline';

export type StepsProps = {
  steps: {
    id: string;
    title: string;
    description?: string;
    optional?: boolean;
  }[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
  orientation?: StepsOrientation;
  style?: StepsStyle;
  className?: string;
};

export function Steps({ steps, currentIndex, onStepClick, orientation = 'horizontal', style = 'default', className }: StepsProps) {
  const isVertical = orientation === 'vertical';

  // VERTICAL: igual que antes
  if (isVertical) {
    return (
      <div className={cn('w-full', className)}>
        <Stack gap={3}>
          {steps.map((s, i) => (
            <StepItem
              key={s.id}
              index={i}
              title={s.title}
              description={s.description}
              optional={s.optional}
              active={i === currentIndex}
              completed={i < currentIndex}
              isLast={i === steps.length - 1}
              orientation={orientation}
              style={style}
              onClick={onStepClick ? () => onStepClick(i) : undefined}
            />
          ))}
        </Stack>
      </div>
    );
  }

  // HORIZONTAL: simétrico + conector
  return (
    <div className={cn('w-full', className)}>
      <div className='flex w-full items-start'>
        {steps.map((s, i) => (
          <StepItem
            key={s.id}
            index={i}
            title={s.title}
            description={s.description}
            optional={s.optional}
            active={i === currentIndex}
            completed={i < currentIndex}
            isLast={i === steps.length - 1}
            orientation={orientation}
            style={style}
            onClick={onStepClick ? () => onStepClick(i) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

type StepItemProps = {
  index: number;
  title: string;
  description?: string;
  optional?: boolean;
  active?: boolean;
  completed?: boolean;
  isLast?: boolean;
  onClick?: () => void;
  orientation: StepsOrientation;
  style: StepsStyle;
};

function StepItem({ title, description, optional, active, completed, isLast, onClick, orientation, style }: StepItemProps) {
  const clickable = Boolean(onClick);
  const isVertical = orientation === 'vertical';

  const tone = completed ? 'success' : active ? 'info' : 'neutral';

  // Conector: gris si no completado, primary si completado
  const connector = completed ? 'bg-primary' : 'bg-border';

  // Layout base
  const baseClickable = clickable ? 'cursor-pointer' : 'cursor-default';

  // Wrapper por orientación
  if (isVertical) {
    // Vertical: puedes mantener tu versión anterior (sin cambios grandes)
    return (
      <div
        className={cn('w-full rounded-lg', baseClickable, clickable ? 'hover:bg-muted/40' : undefined)}
        onClick={onClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
      >
        <Inline gap={3} align='start' className='p-2'>
          <div className='relative flex flex-col items-center'>
            <StatusDot size='md' halo={active} tone={tone} motion={active ? 'pulse' : 'none'} />
            {!isLast ? <div className={cn('mt-2 h-full w-px flex-1', 'bg-border')} /> : null}
          </div>

          <Stack gap={0} className='min-w-0'>
            <Inline gap={2} align='center' className='min-w-0'>
              <Text variant='label' className='truncate'>
                {title}
              </Text>
              {optional ? (
                <Text variant='caption' tone='muted'>
                  Optional
                </Text>
              ) : null}
            </Inline>
            {description ? (
              <Text variant='caption' tone='muted'>
                {description}
              </Text>
            ) : null}
          </Stack>
        </Inline>
      </div>
    );
  }

  // Horizontal: SIMÉTRICO + LÍNEA
  // Cada step es flex-1, y el conector se dibuja desde el centro del dot hasta el final del bloque (excepto el último).
  return (
    <div className={cn('relative flex-1', baseClickable)} onClick={onClick}>
      {/* clickable area */}
      <div
        className={cn('group flex w-full flex-col items-center px-2', clickable ? 'hover:opacity-95' : undefined)}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
      >
        {/* Top row: dot + connector */}
        <div className='relative flex w-full items-center justify-center'>
          <StatusDot size='md' halo={active} tone={tone} motion={active ? 'pulse' : 'none'} />

          {/* Connector line to next step */}
          {!isLast ? (
            <div aria-hidden='true' className={cn('absolute left-1/2 top-1/2 h-px w-[calc(100%-2rem)] -translate-y-1/2 translate-x-4', connector)} />
          ) : null}
        </div>

        {/* Labels */}
        <Stack gap={0} className={cn('mt-2 w-full items-center text-center')}>
          <Inline gap={2} align='center' className='justify-center'>
            <Text variant='label'>{title}</Text>
            {optional ? (
              <Text variant='caption' tone='muted'>
                Optional
              </Text>
            ) : null}
          </Inline>

          {style !== 'pills' && description ? (
            <Text variant='caption' tone='muted'>
              {description}
            </Text>
          ) : null}
        </Stack>
      </div>
    </div>
  );
}
