import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { StatusBadge } from './status-badge';
import { Stack } from '../../foundations/stack';
import { Inline } from '../../foundations/inline';
import { Text } from '../../foundations/text';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: { layout: 'centered' },
  argTypes: {
    status: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning', 'destructive'],
    },
    size: { control: 'select', options: ['sm', 'default'] },
    dot: { control: 'boolean' },
    soft: { control: 'boolean' },
  },
  args: {
    status: 'success',
    size: 'default',
    dot: true,
    soft: true,
  },
};
export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Playground: Story = {
  render: (args) => <StatusBadge {...args} label='Active' />,
};

export const AllStatuses: Story = {
  render: () => (
    <Stack gap={4}>
      <Text variant='label'>Default</Text>
      <Inline gap={2} wrap>
        <StatusBadge status='neutral' label='Draft' />
        <StatusBadge status='info' label='Running' />
        <StatusBadge status='success' label='Healthy' />
        <StatusBadge status='warning' label='Degraded' />
        <StatusBadge status='destructive' label='Failed' />
      </Inline>

      <Text variant='label'>Small</Text>
      <Inline gap={2} wrap>
        <StatusBadge size='sm' status='neutral' label='Draft' />
        <StatusBadge size='sm' status='info' label='Running' />
        <StatusBadge size='sm' status='success' label='Healthy' />
        <StatusBadge size='sm' status='warning' label='Degraded' />
        <StatusBadge size='sm' status='destructive' label='Failed' />
      </Inline>

      <Text variant='label'>Without dot</Text>
      <Inline gap={2} wrap>
        <StatusBadge dot={false} status='success' label='Connected' />
        <StatusBadge dot={false} status='warning' label='Pending' />
      </Inline>
    </Stack>
  ),
};
