import { create } from 'zustand';
import axios from '@/lib/axios';

export interface ServerConfig {
  VPN_HOST: string;
  TCP_SERVICES_PORT_RANGE: string;
}

type ConfigCache = {
  config: ServerConfig;
  lastFetched: number;
};

type ConfigState = {
  config?: ServerConfig;
  lastFetched: number;

  isExpired: () => boolean;
  loadConfig: () => Promise<void>;
};

const EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour (ms)
const STORAGE_KEY = 'config';

/* ---------------- helpers ---------------- */

function readCache(): ConfigCache | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ConfigCache;
  } catch {
    return null;
  }
}

function writeCache(cache: ConfigCache) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

/* ---------------- store ---------------- */

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: undefined,
  lastFetched: 0,

  isExpired: () => {
    const now = Date.now();
    return now - get().lastFetched > EXPIRATION_TIME;
  },

  loadConfig: async () => {
    const cache = readCache();

    // Use cache if valid
    if (cache && !get().isExpired()) {
      set({
        config: cache.config,
        lastFetched: cache.lastFetched,
      });
      return;
    }

    try {
      const { data } = await axios.get<ServerConfig>('/api/config');

      const now = Date.now();

      set({
        config: data,
        lastFetched: now,
      });

      writeCache({
        config: data,
        lastFetched: now,
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },
}));
