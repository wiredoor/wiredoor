import Container from 'typedi';
import { DNSProviderToken } from '../services/dns/providers/dns-provider';
import { CloudflareProvider } from '../services/dns/providers/cloudflare-provider';
import { InvalidDNSProvider } from '../services/dns/providers/invalid-dns-provider';
import { GoDaddyProvider } from '../services/dns/providers/godaddy-provider';
import { Logger } from '../logger';

export default async (): Promise<void> => {
  const providerName = process.env.DNS_PROVIDER;

  Container.set({
    id: DNSProviderToken,
    factory: () => {
      switch (providerName) {
        case 'cloudflare': {
          const apiToken = process.env.CLOUDFLARE_API_TOKEN;

          if (!apiToken) {
            Logger.warn(
              'DNS_PROVIDER set to "cloudflare" but Cloudflare API token not provided.',
            );
            return new InvalidDNSProvider();
          }

          return new CloudflareProvider({ apiToken });
        }
        case 'godaddy': {
          const apiKey = process.env.GODADDY_API_KEY;
          const apiSecret = process.env.GODADDY_API_SECRET;

          if (!apiKey || !apiSecret) {
            Logger.warn(
              'DNS_PROVIDER set to "godaddy" but GoDaddy API credentials not provided.',
            );
            return new InvalidDNSProvider();
          }

          return new GoDaddyProvider({ apiKey, apiSecret });
        }
        default:
          return new InvalidDNSProvider();
      }
    },
  });
};
