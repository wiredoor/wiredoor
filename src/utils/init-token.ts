import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN_PATH = (process.env.INIT_TOKEN_PATH || '/tmp/init-token').trim();

let expiresAt: Date | null = null;

export function getInitTokenPath(): string {
  return TOKEN_PATH;
}

export function getInitTokenExpiresAt(): Date | null {
  return expiresAt;
}

export function isInitTokenExpired(): boolean {
  return !expiresAt || Date.now() > expiresAt.getTime();
}

export async function generateInitTokenFile(
  ttlMinutes = 15,
): Promise<{ path: string; expiresAt: Date }> {
  const token = crypto.randomBytes(24).toString('hex'); // 48 chars
  const exp = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, token + '\n', {
    encoding: 'utf8',
    mode: 0o600,
  });

  expiresAt = exp;
  return { path: TOKEN_PATH, expiresAt: exp };
}

export async function readInitTokenFromFile(): Promise<string | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf8');
    const token = raw.trim();
    return token.length ? token : null;
  } catch {
    return null;
  }
}

export async function verifyInitToken(provided: string): Promise<void> {
  const tokenProvided = String(provided || '').trim();
  const fileToken = await readInitTokenFromFile();

  if (!fileToken)
    throw new Error(
      'Setup token not available. Restart the service to generate a new token.',
    );
  if (isInitTokenExpired())
    throw new Error(
      'Setup token expired. Restart the service to generate a new token.',
    );
  if (tokenProvided !== fileToken) throw new Error('Invalid setup token.');
}

export async function clearInitTokenFile(): Promise<void> {
  expiresAt = null;
  try {
    await fs.unlink(TOKEN_PATH);
  } catch {
    // ignore
  }
}
