import { Token } from 'typedi';

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
  type?: DNSRecordType;
  name: string;
  content?: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
}

export interface FindRecordInput {
  name: string;
  type?: DNSRecordType;
}

export const DNSProviderToken = new Token<DNSProvider>('DNSProvider');

export interface DNSProvider {
  createRecord(input: CreateRecordInput): Promise<DNSRecord>;

  updateRecord(input: UpdateRecordInput): Promise<DNSRecord>;

  deleteRecord(input: FindRecordInput): Promise<void>;

  findRecord(input: FindRecordInput): Promise<DNSRecord | null>;
}
