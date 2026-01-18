import Container from 'typedi';
import Net from '../utils/net';
import { NodeRepository } from '../repositories/node-repository';
import { Logger } from '../logger';

interface PingResult {
  lastPingTs: number;
  reachable: boolean;
  latency: number;
}

const cache = new Map<string, PingResult>();
let interval: NodeJS.Timeout | null = null;
let running = false;
// let clients = 0;

export function startPing(): void {
  // clients++;
  if (interval || running) return;

  running = true;

  try {
    interval = setInterval(async () => {
      const nodes = await Container.get(NodeRepository).find({
        where: { enabled: true },
      });
      await Promise.all(
        nodes.map(async (node) => {
          const prevPing = cache.get(node.address);
          const start = Date.now();
          const reachable = await Net.isReachable(node.address);
          cache.set(node.address, {
            lastPingTs: reachable ? Date.now() : prevPing?.lastPingTs || null,
            reachable,
            latency: Date.now() - start,
          });
        }),
      );
    }, 5000);
  } catch (e: Error | any) {
    Logger.error('Error checking nodes:', e);
  } finally {
    running = false;
  }
}

export function stopPing(): void {
  // clients--;
  // if (clients <= 0 && interval) {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

export function getPing(ip: string): PingResult | null {
  return cache.get(ip) ?? null;
}
