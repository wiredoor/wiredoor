import type { StatusDotMotion, StatusDotTone } from './status-dot';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline' | 'connecting' | 'error';

export function statusPreset(s: ConnectionStatus): {
  tone: StatusDotTone;
  motion: StatusDotMotion;
  label: string;
} {
  switch (s) {
    case 'connected':
      return { tone: 'success', motion: 'ping', label: 'Connected' };
    case 'reconnecting':
      return { tone: 'warning', motion: 'ping', label: 'Reconnecting' };
    case 'connecting':
      return { tone: 'info', motion: 'ping', label: 'Connecting' };
    case 'offline':
      return { tone: 'neutral', motion: 'none', label: 'Offline' };
    case 'error':
      return { tone: 'destructive', motion: 'blink', label: 'Error' };
  }
}
