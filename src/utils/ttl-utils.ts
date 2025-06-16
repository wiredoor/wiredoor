import { DateTime } from 'luxon';

/**
 * Calculates the UTC expiration Date from a TTL string.
 * Accepted formats: "30s", "15m", "1h", "2d"
 */
export function calculateExpiresAtFromTTL(ttl: string): Date {
  if (!ttl) {
    return null;
  }

  const match = ttl.match(/^(\d+)\s*(s|m|h|d)$/i);

  if (!match) {
    throw new Error(
      'Invalid TTL format. Use formats like "120s", "15m", "1h", "2d".',
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const expiresAt = DateTime.utc().plus(
    {
      s: { seconds: value },
      m: { minutes: value },
      h: { hours: value },
      d: { days: value },
    }[unit]!,
  );

  return expiresAt.toJSDate();
}

export function getTtlFromExpiresAt(expiresAt: Date): string | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const expiration = expiresAt.getTime();

  const ttlRemainingMs = Math.max(expiration - now, 0);
  const ms = ttlRemainingMs;

  if (ms === null) return null;

  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
