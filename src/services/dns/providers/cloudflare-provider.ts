import Cloudflare from 'cloudflare';
import { DNSProvider } from './dns-provider';
import {
  CreateRecordInput,
  DNSRecord,
  DNSRecordType,
  FindRecordInput,
  UpdateRecordInput,
} from './dns-provider';
import { CloudflareConfig } from '../../../config/dns-providers-config';

type ZoneInfo = { id: string; name: string };

export class CloudflareProvider implements DNSProvider {
  private readonly client: Cloudflare;
  private zonesCache: ZoneInfo[] | null = null;
  private zonesLoading?: Promise<void>;

  constructor(config: CloudflareConfig) {
    this.client = new Cloudflare({
      apiToken: config.apiToken,
    });
  }

  private async loadZonesIfNeeded(): Promise<void> {
    if (this.zonesCache) return;
    if (this.zonesLoading) {
      await this.zonesLoading;
      return;
    }

    this.zonesLoading = (async () => {
      const res = await this.client.zones.list({ per_page: 1000 });
      this.zonesCache = res.result.map((z: any) => ({
        id: z.id,
        name: z.name,
      }));
      console.log(
        '[CloudflareProvider] Loaded zones:',
        this.zonesCache.map((z) => z.name),
      );
    })();

    await this.zonesLoading;
  }

  private async resolveZoneForDomain(fqdn: string): Promise<ZoneInfo> {
    await this.loadZonesIfNeeded();

    if (!this.zonesCache || this.zonesCache.length === 0) {
      throw new Error('No Cloudflare zones available for this token.');
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
      throw new Error(`No Cloudflare zone found for domain "${fqdn}".`);
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

      // logger.info('DNS record created successfully', { recordId: record.id });
      return this.mapToRecord(record, zone.id);
    } catch (error) {
      // logger.error('Failed to create DNS record', { error, zoneId, input });
      throw new Error(
        `Failed to create DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    } catch (error) {
      // logger.error('Failed to find DNS record by name', { error, zoneId, name, type });
      throw new Error(
        `Failed to find DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateRecord(input: UpdateRecordInput): Promise<DNSRecord> {
    try {
      // logger.info('Updating DNS record', { zoneId, recordId, input });
      const zone = await this.resolveZoneForDomain(input.name);

      const existing = await this.findRecord({
        name: input.name,
        type: input.type,
      });

      if (!existing) {
        throw new Error(`DNS record not found: ${input.name}`);
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

      // logger.info('DNS record updated successfully', { recordId: record.id });
      return this.mapToRecord(record, zone.id);
    } catch (error) {
      // logger.error('Failed to update DNS record', { error, zoneId, recordId });
      throw new Error(
        `Failed to update DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteRecord(input: FindRecordInput): Promise<void> {
    try {
      const record = await this.findRecord(input);

      if (!record) {
        throw new Error(`DNS record not found: ${input.name}`);
      }

      await this.client.dns.records.delete(record.id, {
        zone_id: record.zoneId,
      });

      // logger.info('DNS record deleted successfully', { recordId });
    } catch (error) {
      // logger.error('Failed to delete DNS record', { error, zoneId, recordId });
      throw new Error(
        `Failed to delete DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
