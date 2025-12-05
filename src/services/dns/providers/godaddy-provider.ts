import { GoDaddyConfig } from '../../../config/dns-providers-config';
import {
  CreateRecordInput,
  DNSProvider,
  DNSRecord,
  DNSRecordType,
  FindRecordInput,
  UpdateRecordInput,
} from './dns-provider';
import axios from 'axios';

export class GoDaddyProvider implements DNSProvider {
  private readonly baseUrl = 'https://api.godaddy.com/v1';
  private readonly apiKey: string;
  private readonly apiSecret: string;

  private domainsCache: string[] | null = null;
  private domainsLoading?: Promise<void>;

  constructor(config: GoDaddyConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `sso-key ${this.apiKey}:${this.apiSecret}`,
      'Content-Type': 'application/json',
    };
  }

  private async loadDomainsIfNeeded(): Promise<void> {
    if (this.domainsCache) return;
    if (this.domainsLoading) {
      await this.domainsLoading;
      return;
    }

    this.domainsLoading = (async (): Promise<void> => {
      const res = await axios.get(`${this.baseUrl}/domains`, {
        headers: this.headers,
        params: {
          statuses: 'ACTIVE',
          limit: 1000,
        },
      });

      this.domainsCache = (res.data ?? []).map((d: any) => d.domain as string);
    })();

    await this.domainsLoading;
  }

  private async resolveDomainForFqdn(
    fqdn: string,
  ): Promise<{ domain: string; shortName: string }> {
    const domainLc = fqdn.toLowerCase();

    await this.loadDomainsIfNeeded();

    if (!this.domainsCache || this.domainsCache.length === 0) {
      throw new Error('No GoDaddy domains available for this API key.');
    }

    let bestDomain: string | null = null;

    for (const d of this.domainsCache) {
      const dlc = d.toLowerCase();
      if (domainLc === dlc || domainLc.endsWith('.' + dlc)) {
        if (!bestDomain || dlc.length > bestDomain.length) {
          bestDomain = d;
        }
      }
    }

    if (!bestDomain) {
      throw new Error(`No GoDaddy domain found for FQDN "${fqdn}".`);
    }

    let shortName: string;
    if (domainLc === bestDomain.toLowerCase()) {
      shortName = '@';
    } else {
      shortName = fqdn.slice(0, fqdn.length - bestDomain.length - 1);
    }

    return { domain: bestDomain, shortName };
  }

  private mapToRecord(record: any, domain: string): DNSRecord {
    const relativeName = record.name as string;
    const fqdn = relativeName === '@' ? domain : `${relativeName}.${domain}`;

    return {
      type: record.type as DNSRecordType,
      name: fqdn,
      content: record.data,
      ttl: record.ttl,
      zoneId: domain,
    };
  }

  async findRecord(input: FindRecordInput): Promise<DNSRecord | null> {
    const { name: fqdn, type } = input;

    const { domain, shortName } = await this.resolveDomainForFqdn(fqdn);

    const { data: records } = await axios.get(
      `${this.baseUrl}/domains/${domain}/records/${type}/${shortName}`,
      { headers: this.headers },
    );

    if (!records.length) {
      return null;
    }

    return this.mapToRecord(records[0], domain);
  }

  async createRecord(params: CreateRecordInput): Promise<DNSRecord> {
    const { name: fqdn, type, content, ttl = 600 } = params;
    const { domain, shortName } = await this.resolveDomainForFqdn(fqdn);

    await axios.patch(
      `${this.baseUrl}/domains/${domain}/records`,
      [
        {
          name: shortName,
          data: content,
          type,
          ttl,
        },
      ],
      {
        headers: this.headers,
      },
    );

    return this.findRecord({ name: fqdn, type }) as Promise<DNSRecord>;
  }

  async updateRecord(input: UpdateRecordInput): Promise<DNSRecord> {
    const { name: fqdn, type, content, ttl = 600 } = input;

    const { domain, shortName } = await this.resolveDomainForFqdn(fqdn);

    await axios.put(
      `${this.baseUrl}/domains/${domain}/records/${type}/${shortName}`,
      [
        {
          type,
          name: shortName,
          data: content,
          ttl,
        },
      ],
      {
        headers: this.headers,
      },
    );

    return this.findRecord({ name: fqdn, type }) as Promise<DNSRecord>;
  }

  async deleteRecord(input: FindRecordInput): Promise<void> {
    const existing = await this.findRecord(input);

    if (!existing) {
      return;
    }

    await axios.put(
      `${this.baseUrl}/domains/${existing.zoneId}/records/${existing.type}/${existing.name}`,
      [],
      {
        headers: this.headers,
      },
    );
  }
}
