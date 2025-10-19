import * as crypto from 'crypto';
import config from '../config';

const algorithm = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encrypt(secret: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(config.encryption.secret, 'base64'),
    iv,
  );

  let encrypted = cipher.update(secret, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return [iv.toString('base64'), tag.toString('base64'), encrypted].join('.');
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, encrypted] = payload.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(config.encryption.secret, 'base64'),
    iv,
  );
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
