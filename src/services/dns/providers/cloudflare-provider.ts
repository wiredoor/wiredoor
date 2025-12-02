import Cloudflare from 'cloudflare';
import { DNSProvider } from './dns-provider';
import {
  CreateRecordInput,
  DNSRecord,
  DNSRecordType,
  FindRecordInput,
  ListRecordsInput,
  ListRecordsResult,
  UpdateRecordInput,
} from '../dns-service';
import { CloudflareConfig } from '../../../config/dns-providers-config';

export class CloudflareProvider implements DNSProvider {
  private readonly client: Cloudflare;

  constructor(config: CloudflareConfig) {
    this.client = new Cloudflare({
      apiToken: config.apiToken,
    });
  }

  private mapToRecord(cfRecord: Cloudflare.DNS.Records.Record): DNSRecord {
    return {
      id: (cfRecord as any).id,
      type: cfRecord.type as DNSRecordType,
      name: cfRecord.name,
      content: cfRecord.content,
      ttl: cfRecord.ttl,
      zoneId: (cfRecord as any).zone_id,
      priority: (cfRecord as any).priority,
      proxied: 'proxied' in cfRecord ? cfRecord.proxied : undefined,
    };
  }

  async listRecords(
    zoneId: string,
    query?: ListRecordsInput,
  ): Promise<ListRecordsResult> {
    try {
      const params: Cloudflare.DNS.Records.RecordListParams = {
        zone_id: zoneId,
      };

      if (query?.type) {
        params.type = query.type as any;
      }
      if (query?.name) {
        params.name.contains = query.name;
      }
      if (query?.page) {
        params.page = query.page;
      }
      if (query?.perPage) {
        params.per_page = query.perPage;
      }

      const response = await this.client.dns.records.list(params);

      // Cloudflare SDK devuelve una página iterable
      const records: DNSRecord[] = [];
      for await (const record of response) {
        records.push(this.mapToRecord(record));
      }

      // Obtener información de paginación del primer request
      const firstPage = await this.client.dns.records.list({
        ...params,
        page: 1,
        per_page: query?.perPage ?? 20,
      });

      return {
        records,
        totalCount:
          (firstPage as any).result_info?.total_count || records.length,
        page: query?.page ?? 1,
        perPage: query?.perPage ?? 20,
      };
    } catch (error) {
      // logger.error('Failed to list DNS records', { error, zoneId, query });
      throw new Error(
        `Failed to list DNS records: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getRecord(zoneId: string, recordId: string): Promise<DNSRecord | null> {
    try {
      const record = await this.client.dns.records.get(recordId, {
        zone_id: zoneId,
      });

      return this.mapToRecord(record);
    } catch (error: any) {
      if (error?.status === 404) {
        // logger.warn('DNS record not found', { zoneId, recordId });
        return null;
      }
      // logger.error('Failed to get DNS record', { error, zoneId, recordId });
      throw new Error(
        `Failed to get DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findRecordByName(
    zoneId: string,
    name: string,
    type?: string,
  ): Promise<DNSRecord | null> {
    try {
      const params: Cloudflare.DNS.Records.RecordListParams = {
        zone_id: zoneId,
        name: { exact: name },
        per_page: 1,
      };

      if (type) {
        params.type = type as any;
      }

      const response = await this.client.dns.records.list(params);

      for await (const record of response) {
        return this.mapToRecord(record);
      }

      return null;
    } catch (error) {
      // logger.error('Failed to find DNS record by name', { error, zoneId, name, type });
      throw new Error(
        `Failed to find DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findRecord(
    zoneId: string,
    input: FindRecordInput,
  ): Promise<DNSRecord | null> {
    try {
      if (input.id) {
        return this.getRecord(zoneId, input.id);
      }

      const params: Cloudflare.DNS.Records.RecordListParams = {
        zone_id: zoneId,
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
        return this.mapToRecord(record);
      }

      return null;
    } catch (error) {
      // logger.error('Failed to find DNS record by name', { error, zoneId, name, type });
      throw new Error(
        `Failed to find DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createRecord(
    zoneId: string,
    input: CreateRecordInput,
  ): Promise<DNSRecord> {
    try {
      // logger.info('Creating DNS record', { zoneId, input });

      const record = await this.client.dns.records.create({
        zone_id: zoneId,
        type: input.type,
        name: input.name,
        content: input.content,
        ttl: input.ttl ?? 1,
        priority: input.priority,
        proxied: input.proxied ?? false,
      });

      // logger.info('DNS record created successfully', { recordId: record.id });
      return this.mapToRecord(record);
    } catch (error) {
      // logger.error('Failed to create DNS record', { error, zoneId, input });
      throw new Error(
        `Failed to create DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateRecord(
    zoneId: string,
    input: UpdateRecordInput,
  ): Promise<DNSRecord> {
    try {
      // logger.info('Updating DNS record', { zoneId, recordId, input });

      const record = await this.client.dns.records.edit(input.id, {
        zone_id: zoneId,
        type: input.type,
        name: input.name,
        content: input.content,
        ttl: input.ttl,
        priority: input.priority,
        proxied: input.proxied,
      });

      // logger.info('DNS record updated successfully', { recordId: record.id });
      return this.mapToRecord(record);
    } catch (error) {
      // logger.error('Failed to update DNS record', { error, zoneId, recordId });
      throw new Error(
        `Failed to update DNS record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<void> {
    try {
      // logger.info('Deleting DNS record', { zoneId, recordId });

      await this.client.dns.records.delete(recordId, {
        zone_id: zoneId,
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
