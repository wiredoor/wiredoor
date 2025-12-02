import { DNSProvider } from './providers/dns-provider';

export type DNSRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SRV'
  | 'CAA'
  | 'PTR';

export interface DNSRecord {
  id?: string;
  type: DNSRecordType;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  zoneId?: string;
  zoneName?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateRecordInput {
  type: DNSRecordType;
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
}

export interface UpdateRecordInput {
  id: string;
  type?: DNSRecordType;
  name?: string;
  content?: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
}

export interface FindRecordInput {
  id?: string;
  name?: string;
  type?: DNSRecordType;
}

export interface ListRecordsInput {
  type?: DNSRecordType;
  name?: string;
  page?: number;
  perPage?: number;
}

export interface ListRecordsResult {
  records: DNSRecord[];
  totalCount: number;
  page: number;
  perPage: number;
}

export class DNSService {
  constructor(private readonly provider: DNSProvider) {}

  async createRecord(
    zoneId: string,
    input: CreateRecordInput,
  ): Promise<DNSRecord> {
    // logger.info('Creating DNS record', { zoneId, name: input.name, type: input.type });
    const record = await this.provider.createRecord(zoneId, input);

    // logger.info('DNS record created successfully', { recordId: record.id });
    return record;
  }

  async updateRecord(
    zoneId: string,
    input: UpdateRecordInput,
  ): Promise<DNSRecord> {
    // logger.info('Updating DNS record', { zoneId, recordId });

    // Verificar que el record existe
    const existing = await this.provider.findRecord(zoneId, {
      id: input.id,
      name: input.name,
      type: input.type,
    });
    if (!existing) {
      throw new Error(`DNS record not found: ${input.id}`);
    }

    const record = await this.provider.updateRecord(zoneId, input);

    // logger.info('DNS record updated successfully', { recordId: record.id });
    return record;
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<void> {
    // logger.info('Deleting DNS record', { zoneId, recordId });

    const existing = await this.provider.findRecord(zoneId, { id: recordId });
    if (!existing) {
      throw new Error(`DNS record not found: ${recordId}`);
    }

    await this.provider.deleteRecord(zoneId, recordId);

    // logger.info('DNS record deleted successfully', { recordId });
  }

  async getRecord(zoneId: string, recordId: string): Promise<DNSRecord> {
    // logger.info('Getting DNS record', { zoneId, recordId });

    const record = await this.provider.findRecord(zoneId, { id: recordId });
    if (!record) {
      throw new Error(`DNS record not found: ${recordId}`);
    }

    return record;
  }

  async findRecordByName(
    zoneId: string,
    name: string,
    type?: string,
  ): Promise<DNSRecord | null> {
    // logger.info('Finding DNS record by name', { zoneId, name, type });
    return this.provider.findRecord(zoneId, {
      name,
      type: type as DNSRecordType,
    });
  }

  async listRecords(
    zoneId: string,
    query?: ListRecordsInput,
  ): Promise<ListRecordsResult> {
    // logger.info('Listing DNS records', { zoneId, query });
    return this.provider.listRecords(zoneId, query);
  }
}
