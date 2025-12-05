import Container from 'typedi';
import { DNSProviderToken } from '../services/dns/providers/dns-provider';
import { CloudflareProvider } from '../services/dns/providers/cloudflare-provider';
import { InvalidDNSProvider } from '../services/dns/providers/invalid-dns-provider';
import { GoDaddyProvider } from '../services/dns/providers/godaddy-provider';

export default async (): Promise<void> => {
  const providerName = process.env.DNS_PROVIDER;

  Container.set({
    id: DNSProviderToken,
    factory: () => {
      switch (providerName) {
        case 'cloudflare': {
          const apiToken = process.env.CLOUDFLARE_API_TOKEN;

          if (!apiToken) {
            // console.warn('[DNS] CLOUDFLARE_API_TOKEN no definido. Usando NoopDNSProvider.');
            return new InvalidDNSProvider();
          }

          return new CloudflareProvider({ apiToken });
        }
        case 'godaddy': {
          const apiKey = process.env.GODADDY_API_KEY;
          const apiSecret = process.env.GODADDY_API_SECRET;

          if (!apiKey || !apiSecret) {
            // console.warn('[DNS] GODADDY_API_KEY/GODADDY_API_SECRET/GODADDY_DOMAIN faltan. Usando NoopDNSProvider.');
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
