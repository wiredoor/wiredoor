import { Inject, Service } from 'typedi';
import {
  DNSProvider,
  DNSRecord,
  DNSRecordType,
  FindRecordInput,
  CreateRecordInput,
  DNSProviderToken,
  UpdateRecordInput,
} from './providers/dns-provider';

@Service()
export class DNSService {
  constructor(
    @Inject(DNSProviderToken) private readonly provider: DNSProvider,
  ) {}

  async createRecord(input: CreateRecordInput): Promise<DNSRecord> {
    // logger.info('Creating DNS record', { zoneId, name: input.name, type: input.type });
    const record = await this.provider.createRecord(input);

    // logger.info('DNS record created successfully', { recordId: record.id });
    return record;
  }

  async updateRecord(input: UpdateRecordInput): Promise<DNSRecord> {
    // logger.info('Updating DNS record', { zoneId, recordId });
    const record = await this.provider.updateRecord(input);

    // logger.info('DNS record updated successfully', { recordId: record.id });
    return record;
  }

  async deleteRecord(input: FindRecordInput): Promise<void> {
    // logger.info('Deleting DNS record', { zoneId, recordId });

    await this.provider.deleteRecord(input);

    // logger.info('DNS record deleted successfully', { recordId });
  }

  async findRecordByName(
    name: string,
    type?: string,
  ): Promise<DNSRecord | null> {
    // logger.info('Finding DNS record by name', { zoneId, name, type });
    return this.provider.findRecord({
      name,
      type: type as DNSRecordType,
    });
  }
}
