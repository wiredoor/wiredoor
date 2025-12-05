import { DNSProvider } from './dns-provider';

export class InvalidDNSProvider implements DNSProvider {
  async createRecord(input: any): Promise<any> {
    void input;
    throw new Error('Invalid DNS Provider configured.');
  }

  async updateRecord(input: any): Promise<any> {
    void input;
    throw new Error('Invalid DNS Provider configured.');
  }

  async deleteRecord(input: any): Promise<void> {
    void input;
    throw new Error('Invalid DNS Provider configured.');
  }

  async findRecord(input: any): Promise<any> {
    void input;
    throw new Error('Invalid DNS Provider configured.');
  }

  async listRecords(input?: any): Promise<any> {
    void input;
    throw new Error('Invalid DNS Provider configured.');
  }
}
