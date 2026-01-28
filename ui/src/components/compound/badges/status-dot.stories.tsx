import type { Meta, StoryObj } from '@storybook/react';

import { StatusDot } from './status-dot';
import { statusPreset } from './status-presets';

import { Stack } from '../../foundations/stack';
import { Inline } from '../../foundations/inline';
import { Text } from '../../foundations/text';
import { Surface } from '../../foundations/surface';

const meta: Meta<typeof StatusDot> = {
  title: 'Components/StatusDot',
  component: StatusDot,
  parameters: { layout: 'centered' },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning', 'destructive'],
    },
    motion: {
      control: 'select',
      options: ['none', 'pulse', 'ping', 'blink', 'spin'],
    },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
    halo: { control: 'boolean' },
  },
  args: {
    tone: 'success',
    motion: 'pulse',
    size: 'md',
    halo: true,
    label: 'Connected',
  },
};
export default meta;
type Story = StoryObj<typeof StatusDot>;

export const Playground: Story = {
  render: (args) => <StatusDot {...args} />,
};

export const Presets: Story = {
  render: () => (
    <Stack gap={4}>
      <Surface elevation='sm' radius='lg' className='p-4'>
        <Stack gap={3}>
          <Text variant='label'>Connection presets</Text>

          <Inline gap={4} wrap>
            {(['connected', 'reconnecting', 'connecting', 'offline', 'error'] as const).map((s) => {
              const p = statusPreset(s);
              return (
                <Inline key={s} gap={2} align='center'>
                  <StatusDot tone={p.tone} motion={p.motion} halo label={p.label} />
                  <Text variant='body-sm'>{p.label}</Text>
                </Inline>
              );
            })}
          </Inline>
        </Stack>
      </Surface>
    </Stack>
  ),
};
