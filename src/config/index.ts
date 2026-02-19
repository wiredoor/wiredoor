import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { Logger } from '../logger';

dotenv.config();

const VPN_PORT = process.env.VPN_PORT || '51820';
const subnet = process.env.VPN_SUBNET || '10.0.0.0/24';
const defaultPreUpScript = ``;
const defaultPostUpScript = `
iptables -t nat -A POSTROUTING -s ${subnet} -o eth0 -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport ${VPN_PORT} -j ACCEPT;
iptables -A FORWARD -i wg0 -j ACCEPT;
iptables -A FORWARD -o wg0 -j ACCEPT;
`;

const defaultPreDownScript = ``;
const defaultPostDownScript = `
iptables -t nat -D POSTROUTING -s ${subnet} -o eth0 -j MASQUERADE;
iptables -D INPUT -p udp -m udp --dport ${VPN_PORT} -j ACCEPT;
iptables -D FORWARD -i wg0 -j ACCEPT;
iptables -D FORWARD -o wg0 -j ACCEPT;
`;

const ACCESS_TOKEN_KEY_ENV = 'PRIVATE_KEY';
const REFRESH_TOKEN_KEY_ENV = 'REFRESH_PRIVATE_KEY';
const ENCRYPTION_KEY_ENV = 'ENCRYPTION_KEY';
const API_KEY_SECRET_ENV = 'API_KEY_SECRET';

function getKey(
  name: string,
  file: string,
  length = 64,
  base64 = true,
): string {
  const envValue = process.env[name];
  if (envValue && envValue.trim().length > 0) return envValue.trim();

  try {
    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf-8').trim();
      if (existing.length > 0) return existing;
    }
    const rawKey = randomBytes(length);
    const secret = base64 ? rawKey.toString('base64') : rawKey.toString('hex');

    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(file, `${secret}\n`, { mode: 0o600 });

    Logger.info(`Secret ${name} was generated and stored at ${file}`);
    return secret;
  } catch (error: any) {
    Logger.error(
      `Error loading or generating secret "${name}" (${file}):`,
      error,
    );
    throw error;
  }
}

export default {
  app: {
    name: process.env.APP_NAME || 'Wiredoor',
    port: parseInt(process.env.APP_PORT || '') || 3000,
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'console',
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
      ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)
      : undefined,
  },
  session: {
    name: process.env.SESSION_COOKIE_NAME || 'wiredoor_session',
    secret: process.env.SESSION_SECRET,
  },
  db: {
    type: process.env.DB_CONNECTION || ('sqlite' as 'mysql' | 'sqlite'),
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || '/data/db.sqlite',
  },
  jwt: {
    secret: getKey(ACCESS_TOKEN_KEY_ENV, '/data/.key'),
    refreshSecret: getKey(REFRESH_TOKEN_KEY_ENV, '/data/.refresh.key'),
    algo: process.env.JWT_ALGORITHM || 'HS256',
  },
  keys: {
    secret: getKey(API_KEY_SECRET_ENV, '/data/.api.key'),
  },
  encryption: {
    secret: getKey(ENCRYPTION_KEY_ENV, '/data/.enc.key', 32),
  },
  server: {
    port_range: process.env.TCP_SERVICES_PORT_RANGE,
  },
  dns: {
    provider: process.env.DNS_PROVIDER || null,
  },
  nginx: {
    bodySize: process.env.NGINX_CLIENT_MAX_BODY_SIZE || '100m',
    logs: process.env.SERVER_LOGS_DIR || '/var/log/nginx',
    http3domain: process.env.NGINX_HTTP3_DOMAIN || '',
  },
  wireguard: {
    host: process.env.VPN_HOST || '127.0.0.1',
    port: VPN_PORT,
    subnet: subnet,
    mtu: parseInt(process.env.VPN_DEFAULT_MTU || '') || undefined,
    preUp: (process.env.WG_PRE_UP_SCRIPT || defaultPreUpScript)
      .split('\n')
      .join(' '),
    postUp: (process.env.WG_POST_UP_SCRIPT || defaultPostUpScript)
      .split('\n')
      .join(' '),
    preDown: (process.env.WG_PRE_DOWN_SCRIPT || defaultPreDownScript)
      .split('\n')
      .join(' '),
    postDown: (process.env.WG_POST_DOWN_SCRIPT || defaultPostDownScript)
      .split('\n')
      .join(' '),
  },
  oauth2: {
    provider: process.env.OAUTH2_PROXY_PROVIDER,
    clientId: process.env.OAUTH2_PROXY_CLIENT_ID,
    clientSecret: process.env.OAUTH2_PROXY_CLIENT_SECRET,
  },
};
