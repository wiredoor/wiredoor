import {
  DNSRecord,
  CreateRecordInput,
  UpdateRecordInput,
  FindRecordInput,
  ListRecordsInput,
  ListRecordsResult,
} from '../dns-service';

export interface DNSProvider {
  createRecord(zoneId: string, input: CreateRecordInput): Promise<DNSRecord>;

  updateRecord(zoneId: string, input: UpdateRecordInput): Promise<DNSRecord>;

  deleteRecord(zoneId: string, recordId: string): Promise<void>;

  findRecord(zoneId: string, input: FindRecordInput): Promise<DNSRecord | null>;

  listRecords(
    zoneId: string,
    input?: ListRecordsInput,
  ): Promise<ListRecordsResult>;
}
