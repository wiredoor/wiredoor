import React from 'react';
import { useFormContext } from '@/components/compound/form';

export function NodeFieldHelp({ resolver }: { resolver: (key?: string) => React.ReactNode }) {
  const { state } = useFormContext();

  return <>{resolver(state.focused?.key)}</>;
}
