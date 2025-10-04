import { readFile } from 'fs/promises';
import net from 'net';
import tls from 'tls';
import dns from 'dns';
import https from 'https';
import CLI from './cli';
import config from '../config';
import { Resolver } from 'dns/promises';
import IP_CIDR from './ip-cidr';
import { logger } from '../providers/logger';

export default class Net {
  static async addRoute(
    subnet: string,
    via: string,
    i = 'wg0',
  ): Promise<boolean> {
    logger.debug(`NET: Adding route ${subnet} via ${via} dev ${i}`);
    try {
      await CLI.exec(`sudo ip route add ${subnet} via ${via} dev ${i}`);

      logger.debug(`NET: Route added successfully`);
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      logger.debug(e, `NET: Failed to add route`);
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async delRoute(subnet: string, via?: string): Promise<boolean> {
    logger.debug(`NET: Deleting route ${subnet}`);
    try {
      await CLI.exec(`sudo ip route del ${subnet}`);

      logger.debug(`NET: Route deleted successfully`);

      return true;
    } catch {
      logger.debug(`NET: Failed to delete route`);

      return false;
    }
  }

  static async isReachable(ip: string): Promise<boolean> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const pingCmd = `ping -q -c 1 -4 -s 8 -W 3 ${ip}`;
      try {
        const { stdout } = await CLI.exec(pingCmd);
        if (
          stdout &&
          stdout.indexOf(
            '1 packets transmitted, 1 packets received, 0% packet loss',
          ) !== -1
        ) {
          resolve(true);
        } else {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    });
  }

  static async isIPForwardEnabled(): Promise<boolean> {
    try {
      const data = await readFile('/proc/sys/net/ipv4/ip_forward', 'utf8');
      return data.trim() === '1';
    } catch {
      return false;
    }
  }

  static async nslookup(domain: string, resolver?: string): Promise<string[]> {
    const resolveWith = (
      res: dns.Resolver | typeof dns,
    ): Promise<string[] | null> => {
      return new Promise((resolve) => {
        res.resolve(domain, (err, addresses) => {
          if (err || !addresses?.length) {
            return resolve(null);
          }
          resolve(addresses);
        });
      });
    };

    const tryResolve = async (): Promise<string[] | null> => {
      try {
        if (resolver) {
          const nsResolver = new dns.Resolver();
          nsResolver.setServers([resolver]);
          return await resolveWith(nsResolver);
        }
        return await resolveWith(dns);
      } catch {
        return null;
      }
    };

    const result = await tryResolve();
    if (result) return result;

    try {
      await CLI.exec(`ping -c 1 -W 1 ${domain}`);
    } catch {
      // ignore ping errors
    }

    return tryResolve();
  }

  static async checkCNAME(domain: string): Promise<string[]> {
    try {
      return new Promise((resolve) => {
        dns.resolve(domain, (err, addresses) => {
          if (err) {
            resolve(null);
          }
          if (!addresses || !addresses.length) {
            resolve(null);
          }
          resolve(addresses);
        });
      });
    } catch {
      return null;
    }
  }

  static async lookupIncludesThisServer(domain: string): Promise<boolean> {
    const lookup = await Promise.all([
      this.nslookup(domain),
      this.checkCNAME(domain),
    ]);

    const ip = await this.getRealPublicIp();
    let configuredIp = config.wireguard.host;

    if (!IP_CIDR.isValidIP(configuredIp)) {
      configuredIp = (await this.nslookup(configuredIp))[0];
    }

    return (
      (lookup[0] || lookup[1]) &&
      (lookup.flat().includes(ip) || lookup.flat().includes(configuredIp))
    );
  }

  static async getAvailableLocalPort(
    knownPorts: number[],
    min: number,
    max: number,
  ): Promise<number> {
    const usedPorts = new Set(knownPorts);

    const rangeSize = max - min + 1;

    if (usedPorts.size >= rangeSize) {
      throw new Error(
        `No ports avaliable in range from ${min} to ${max} to expose your service.`,
      );
    }

    let port: number = null;

    for (let i = min; i <= max; i++) {
      if (!usedPorts.has(i)) {
        const used = await this.checkPort('127.0.0.1', i, null, null, 500);
        if (!used) {
          port = i;
          break;
        }
      }
    }

    return port;
  }

  static async checkPort(
    host: string,
    port: number,
    resolver?: string,
    ssl?: boolean,
    timeout = 3000,
  ): Promise<boolean> {
    if (resolver) {
      const dnsResolver = new Resolver();
      dnsResolver.setServers([resolver]);
      const [resolved] = await dnsResolver.resolve4(host);
      logger.debug(
        `NET: Resolved hostname ${host} to ${resolved} using ${resolver}`,
      );
      host = resolved;
    }

    return new Promise((resolve) => {
      let socket = new net.Socket();

      if (ssl) {
        socket = tls.connect(
          {
            host,
            port,
            rejectUnauthorized: true,
          },
          () => {
            socket.end();
            logger.debug(`NET: SSL connection established to ${host}:${port}`);
            resolve(true);
          },
        );
      } else {
        socket = socket.connect({
          host,
          port,
        });
      }

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        logger.debug(`NET: Connection established to ${host}:${port}`);
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        logger.debug(`NET: Connection timeout to ${host}:${port}`);
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        logger.debug(`NET: Connection error to ${host}:${port}`);
        resolve(false);
      });
    });
  }

  static async getWireguardIP(): Promise<string> {
    let wireguardIp = config.wireguard.host;

    if (!IP_CIDR.isValidIP(wireguardIp)) {
      try {
        wireguardIp = (await Net.nslookup(wireguardIp))[0];
      } catch {
        throw new Error(`Unable to resolve Server IP address`);
      }
    }

    return wireguardIp;
  }

  static async getRealPublicIp(): Promise<string> {
    return new Promise((resolve) => {
      https
        .get('https://checkip.amazonaws.com', (res) => {
          if (res.statusCode !== 200) {
            resolve('');
            return;
          }

          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data.trim()));
        })
        .on('error', () => resolve(''));
    });
  }
}
