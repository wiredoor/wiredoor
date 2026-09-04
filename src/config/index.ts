import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const defaultAdminEmail = 'admin@example.com';
const defaultAdminPassword = 'ChangeMe1st!';

const APP_PORT = parseInt(process.env.APP_PORT || '') || 3000;
const VPN_PORT = process.env.VPN_PORT || '51820';
const ADDITIONAL_TCP_SERVICES_PORTS = process.env.ADDITIONAL_TCP_SERVICES_PORTS;
export const OAUTH2_PROXY_PORT_MIN = 4180;
export const OAUTH2_PROXY_PORT_MAX = 4279;

const reservedPorts = new Set([80, 443, APP_PORT, +VPN_PORT]);
const reservedAdditionalPort = ADDITIONAL_TCP_SERVICES_PORTS?.split(',')
  .map(Number)
  .find(
    (port) =>
      reservedPorts.has(port) ||
      (port >= OAUTH2_PROXY_PORT_MIN && port <= OAUTH2_PROXY_PORT_MAX),
  );

if (reservedAdditionalPort) {
  throw new Error(
    `ADDITIONAL_TCP_SERVICES_PORTS cannot include reserved port ${reservedAdditionalPort}.`,
  );
}

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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function getJWTKey(): string {
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  }
  const filePath: string = '/data/.key';
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
    const newKey = randomBytes(64).toString('base64');

    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(filePath, newKey, { mode: 0o600 });
    return newKey;
  } catch (error) {
    console.error(error);
    throw new Error('Error loading or generating JWT key');
  }
}

function requireAdminEmailEnv(): string {
  const value = requireEnv('ADMIN_EMAIL');
  if (value === defaultAdminEmail) {
    console.warn('WARN: Change default admin email value');
  }
  return value;
}

function requireAdminPasswordEnv(): string {
  const value = requireEnv('ADMIN_PASSWORD');
  if (value === defaultAdminPassword) {
    throw new Error('ADMIN_PASSWORD must be changed from the sample value');
  }
  return value;
}

export default {
  app: {
    name: process.env.APP_NAME || 'Wiredoor',
    port: APP_PORT,
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'console',
  },
  admin: {
    email: requireAdminEmailEnv(),
    password: bcrypt.hashSync(requireAdminPasswordEnv(), 10),
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
    secret: getJWTKey(),
    algo: process.env.JWT_ALGORITHM || 'HS256',
  },
  server: {
    port_range: process.env.TCP_SERVICES_PORT_RANGE,
    additional_ports: ADDITIONAL_TCP_SERVICES_PORTS,
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
