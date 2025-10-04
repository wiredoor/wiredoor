import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { logger } from '../providers/logger';

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

function getKey(
  name: string,
  file: string,
  length = 64,
  base64 = true,
): string {
  const envValue = process.env[name];
  if (envValue) return envValue.trim();

  try {
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, 'utf-8').trim();
    }
    const rawKey = randomBytes(length);
    const secret = base64 ? rawKey.toString('base64') : rawKey.toString('hex');

    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });

    logger.info(`Secret ${name} was generated and stored at ${file}`);

    return secret;
  } catch (error) {
    logger.error({ err: error }, 'Error loading or generating JWT key:');
    throw error;
  }
}

export default {
  app: {
    name: process.env.APP_NAME || 'Wiredoor',
    port: parseInt(process.env.APP_PORT || '') || 3000,
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'ChangeMe1st!', 10),
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
  encryption: {
    secret: getKey(ENCRYPTION_KEY_ENV, '/data/.enc.key'),
  },
  server: {
    port_range: process.env.TCP_SERVICES_PORT_RANGE,
  },
  nginx: {
    logs: process.env.SERVER_LOGS_DIR || '/var/log/nginx',
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
    preDown: (process.env.WG_PRE_UP_SCRIPT || defaultPreDownScript)
      .split('\n')
      .join(' '),
    postDown: (process.env.WG_POST_UP_SCRIPT || defaultPostDownScript)
      .split('\n')
      .join(' '),
  },
  oauth2: {
    provider: process.env.OAUTH2_PROXY_PROVIDER,
    clientId: process.env.OAUTH2_PROXY_CLIENT_ID,
    clientSecret: process.env.OAUTH2_PROXY_CLIENT_SECRET,
  },
};
