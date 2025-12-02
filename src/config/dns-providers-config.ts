export interface CloudflareConfig {
  apiToken: string;
}
export interface DNSProviderConfig {
  provider: 'cloudflare';
  cloudflare?: CloudflareConfig;
}

export function getDNSProviderConfig(): DNSProviderConfig {
  const provider = (process.env.DNS_PROVIDER as 'cloudflare') || 'cloudflare';

  if (provider === 'cloudflare') {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!apiToken) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
    }

    return {
      provider: 'cloudflare',
      cloudflare: {
        apiToken,
      },
    };
  }
}
