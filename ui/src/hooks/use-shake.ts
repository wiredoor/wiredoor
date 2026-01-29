import React from 'react';

export function useShake(duration: number = 500): { shake: boolean; triggerShake: () => void } {
  const [shake, setShake] = React.useState(false);

  const triggerShake = async () => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    setTimeout(() => setShake(false), duration);
  };

  return { shake, triggerShake };
}
