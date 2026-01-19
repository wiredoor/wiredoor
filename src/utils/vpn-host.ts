import dns from 'node:dns/promises';
import IP_CIDR from './ip-cidr';
import Net from './net';

export async function resolveHostnameToPublicIpv4(
  hostname: string,
): Promise<boolean> {
  const ips = await dns.resolve4(hostname).catch(() => []);
  return ips.some((ip) => IP_CIDR.isValidIP(ip));
}

export async function resolveVpnHost(): Promise<{
  host: string;
  source: 'env' | 'discovery';
}> {
  const envHost = (process.env.VPN_HOST || '').trim();

  if (envHost) {
    // IP directa
    if (IP_CIDR.isValidIP(envHost)) {
      return { host: envHost, source: 'env' };
    }

    const ok = await resolveHostnameToPublicIpv4(envHost);
    if (!ok) {
      throw new Error(
        `VPN_HOST resolved but no public IPv4 found for: ${envHost}`,
      );
    }
    return { host: envHost, source: 'env' };
  }

  const ip = await Net.getRealPublicIp();
  process.env.VPN_HOST = ip;
  return { host: ip, source: 'discovery' };
}
