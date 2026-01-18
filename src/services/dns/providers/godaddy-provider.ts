import { GoDaddyConfig } from '../../../config/dns-providers-config';
import { createLogger, ILogger } from '../../../logger';
import {
  CreateRecordInput,
  DNSProvider,
  DNSProviderError,
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
  private readonly logger?: ILogger;

  constructor(config: GoDaddyConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.logger = createLogger({ serviceName: 'GoDaddyProvider' });
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
      try {
        const res = await axios.get(`${this.baseUrl}/domains`, {
          headers: this.headers,
          params: {
            statuses: 'ACTIVE',
            limit: 1000,
          },
        });

        this.domainsCache = (res.data ?? []).map(
          (d: any) => d.domain as string,
        );
        this.logger.debug(
          `Loaded ${this.domainsCache.length} domains from GoDaddy.`,
        );
      } catch (error: Error | any) {
        this.logger.error('Failed to load domains:', error);
        this.domainsCache = [];
      }
    })();

    await this.domainsLoading;
  }

  private async resolveDomainForFqdn(
    fqdn: string,
  ): Promise<{ domain: string; shortName: string }> {
    const domainLc = fqdn.toLowerCase();

    await this.loadDomainsIfNeeded();

    if (!this.domainsCache || this.domainsCache.length === 0) {
      throw new DNSProviderError('godaddy', 'No domains available.', {
        status: 400,
        action: 'NO_DOMAINS',
      });
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
      throw new DNSProviderError(
        'godaddy',
        `No GoDaddy domain found for FQDN "${fqdn}".`,
        { status: 404, action: 'DOMAIN_NOT_FOUND', domain: fqdn },
      );
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

  async canManageDomain(fqdn: string): Promise<boolean> {
    try {
      await this.resolveDomainForFqdn(fqdn);
      return true;
    } catch {
      return false;
    }
  }

  async findRecord(input: FindRecordInput): Promise<DNSRecord | null> {
    const { name: fqdn, type } = input;

    try {
      const { domain, shortName } = await this.resolveDomainForFqdn(fqdn);

      const { data: records } = await axios.get(
        `${this.baseUrl}/domains/${domain}/records/${type}/${shortName}`,
        { headers: this.headers },
      );

      if (!records.length) {
        return null;
      }

      return this.mapToRecord(records[0], domain);
    } catch (error) {
      throw new DNSProviderError(
        'godaddy',
        `Failed to find DNS record: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        {
          status: 500,
          action: 'FIND_RECORD_FAILED',
          error,
        },
      );
    }
  }

  async createRecord(params: CreateRecordInput): Promise<DNSRecord> {
    const { name: fqdn, type, content, ttl = 600 } = params;
    const { domain, shortName } = await this.resolveDomainForFqdn(fqdn);

    try {
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
    } catch (error) {
      throw new DNSProviderError(
        'godaddy',
        `Failed to create DNS record: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        {
          status: 500,
          action: 'CREATE_RECORD_FAILED',
          error,
        },
      );
    }
  }

  async updateRecord(input: UpdateRecordInput): Promise<DNSRecord> {
    const { name: fqdn, type, content, ttl = 600 } = input;

    const { domain, shortName } = await this.resolveDomainForFqdn(fqdn);

    try {
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
    } catch (error) {
      throw new DNSProviderError(
        'godaddy',
        `Failed to update DNS record: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        {
          status: 500,
          action: 'UPDATE_RECORD_FAILED',
          error,
        },
      );
    }
  }

  async deleteRecord(input: FindRecordInput): Promise<void> {
    const existing = await this.findRecord(input);

    if (!existing) {
      return;
    }

    try {
      await axios.put(
        `${this.baseUrl}/domains/${existing.zoneId}/records/${existing.type}/${existing.name}`,
        [],
        {
          headers: this.headers,
        },
      );
    } catch (error) {
      throw new DNSProviderError(
        'godaddy',
        `Failed to delete DNS record: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        {
          status: 500,
          action: 'DELETE_RECORD_FAILED',
          error,
        },
      );
    }
  }
}
