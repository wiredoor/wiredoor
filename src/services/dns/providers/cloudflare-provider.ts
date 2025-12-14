import Cloudflare from 'cloudflare';
import { DNSProvider, DNSProviderError } from './dns-provider';
import {
  CreateRecordInput,
  DNSRecord,
  DNSRecordType,
  FindRecordInput,
  UpdateRecordInput,
} from './dns-provider';
import { CloudflareConfig } from '../../../config/dns-providers-config';
import { createLogger, ILogger } from '../../../logger';

type ZoneInfo = { id: string; name: string };

export class CloudflareProvider implements DNSProvider {
  private readonly client: Cloudflare;
  private zonesCache: ZoneInfo[] | null = null;
  private zonesLoading?: Promise<void>;
  private readonly logger?: ILogger;

  constructor(config: CloudflareConfig) {
    this.client = new Cloudflare({
      apiToken: config.apiToken,
    });
    this.logger = createLogger({ serviceName: 'CloudflareProvider' });
  }

  private async loadZonesIfNeeded(): Promise<void> {
    if (this.zonesCache) return;
    if (this.zonesLoading) {
      await this.zonesLoading;
      return;
    }

    this.zonesLoading = (async (): Promise<void> => {
      try {
        const res = await this.client.zones.list({ per_page: 1000 });
        this.zonesCache = res.result.map((z: any) => ({
          id: z.id,
          name: z.name,
        }));
        this.logger.debug(
          `Loaded ${this.zonesCache.length} zones from Cloudflare.`,
        );
      } catch (error: Error | any) {
        this.logger.error(`Failed to load zones: ${error.message}`, error);
        this.zonesCache = [];
      }
    })();

    await this.zonesLoading;
  }

  private async resolveZoneForDomain(fqdn: string): Promise<ZoneInfo> {
    await this.loadZonesIfNeeded();

    if (!this.zonesCache || this.zonesCache.length === 0) {
      throw new DNSProviderError('cloudflare', 'No zones available.', {
        status: 400,
        action: 'NO_ZONES',
      });
    }

    const domain = fqdn.toLowerCase();

    let best: ZoneInfo | null = null;

    for (const zone of this.zonesCache) {
      const zn = zone.name.toLowerCase();
      if (domain === zn || domain.endsWith('.' + zn)) {
        if (!best || zn.length > best.name.length) {
          best = zone;
        }
      }
    }

    if (!best) {
      throw new DNSProviderError(
        'cloudflare',
        `No Cloudflare zone found for domain "${fqdn}".`,
        { status: 404, action: 'ZONE_NOT_FOUND', domain },
      );
    }

    return best;
  }

  private mapToRecord(
    cfRecord: Cloudflare.DNS.Records.Record,
    zoneId?: string,
  ): DNSRecord {
    return {
      id: (cfRecord as any).id,
      type: cfRecord.type as DNSRecordType,
      name: cfRecord.name,
      content: cfRecord.content,
      ttl: cfRecord.ttl,
      zoneId: (cfRecord as any).zone_id || zoneId,
      priority: (cfRecord as any).priority,
      proxied: 'proxied' in cfRecord ? cfRecord.proxied : undefined,
    };
  }

  async canManageDomain(fqdn: string): Promise<boolean> {
    try {
      await this.resolveZoneForDomain(fqdn);
      return true;
    } catch {
      return false;
    }
  }

  async createRecord(input: CreateRecordInput): Promise<DNSRecord> {
    try {
      const zone = await this.resolveZoneForDomain(input.name);

      const record = await this.client.dns.records.create({
        zone_id: zone.id,
        type: input.type,
        name: input.name,
        content: input.content,
        ttl: input.ttl ?? 1,
        priority: input.priority,
        proxied: input.proxied ?? false,
      });

      return this.mapToRecord(record, zone.id);
    } catch (error) {
      throw new DNSProviderError(
        'cloudflare',
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

  async findRecord(input: FindRecordInput): Promise<DNSRecord | null> {
    try {
      const zone = await this.resolveZoneForDomain(input.name);

      const params: Cloudflare.DNS.Records.RecordListParams = {
        zone_id: zone.id,
        per_page: 1,
      };

      if (input.name) {
        params.name = { exact: input.name };
      }

      if (input.type) {
        params.type = input.type as any;
      }

      const response = await this.client.dns.records.list(params);

      for await (const record of response) {
        return this.mapToRecord(record, zone.id);
      }

      return null;
    } catch (error: Error | any) {
      throw new DNSProviderError(
        'cloudflare',
        `Failed to find DNS record by name: ${
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

  async updateRecord(input: UpdateRecordInput): Promise<DNSRecord> {
    try {
      const zone = await this.resolveZoneForDomain(input.name);

      const existing = await this.findRecord({
        name: input.name,
        type: input.type,
      });

      if (!existing) {
        throw new DNSProviderError(
          'cloudflare',
          `DNS record not found: ${input.name}`,
          {
            status: 404,
            action: 'RECORD_NOT_FOUND',
            name: input.name,
            type: input.type,
          },
        );
      }

      const record = await this.client.dns.records.edit(existing.id, {
        zone_id: zone.id,
        type: input.type,
        name: input.name,
        content: input.content,
        ttl: input.ttl,
        priority: input.priority,
        proxied: input.proxied,
      });

      return this.mapToRecord(record, zone.id);
    } catch (error) {
      throw new DNSProviderError(
        'cloudflare',
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
    try {
      const record = await this.findRecord(input);

      if (!record) {
        throw new DNSProviderError(
          'cloudflare',
          `DNS record not found: ${input.name}`,
          {
            status: 404,
            action: 'RECORD_NOT_FOUND',
            name: input.name,
            type: input.type,
          },
        );
      }

      await this.client.dns.records.delete(record.id, {
        zone_id: record.zoneId,
      });

      // logger.info('DNS record deleted successfully', { recordId });
    } catch (error) {
      throw new DNSProviderError(
        'cloudflare',
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
