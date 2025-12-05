import { Logger } from '../../../logger';
import { DNSProvider } from './dns-provider';

export class InvalidDNSProvider implements DNSProvider {
  async createRecord(input: any): Promise<any> {
    void input;
    Logger.warn(
      'Attempted to create a DNS record. Please configure a valid DNS provider.',
    );
    throw new Error('Invalid DNS provider configured.');
  }

  async updateRecord(input: any): Promise<any> {
    void input;
    Logger.warn(
      'Attempted to update a DNS record. Please configure a valid DNS provider.',
    );
    throw new Error('Invalid DNS provider configured.');
  }

  async deleteRecord(input: any): Promise<void> {
    void input;
    Logger.warn(
      'Attempted to delete a DNS record. Please configure a valid DNS provider.',
    );
    throw new Error('Invalid DNS provider configured.');
  }

  async findRecord(input: any): Promise<any> {
    void input;
    Logger.warn(
      'Attempted to find a DNS record. Please configure a valid DNS provider.',
    );
    throw new Error('Invalid DNS provider configured.');
  }
}
