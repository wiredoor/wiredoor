import { Inject, Service } from 'typedi';
import {
  DNSProvider,
  DNSRecord,
  DNSRecordType,
  FindRecordInput,
  CreateRecordInput,
  DNSProviderToken,
  UpdateRecordInput,
  DNSProviderError,
} from './providers/dns-provider';
import { createLogger, ILogger } from '../../logger';

@Service()
export class DNSService {
  private readonly logger: ILogger;

  constructor(
    @Inject(DNSProviderToken) private readonly provider: DNSProvider,
  ) {
    this.logger = createLogger({ serviceName: 'DNSService' });
  }

  async createRecord(input: CreateRecordInput): Promise<DNSRecord> {
    this.logger.info(`Creating new ${input.type} record ${input.name}`, {
      ...input,
    });
    try {
      const record = await this.provider.createRecord(input);

      return record;
    } catch (error: DNSProviderError | Error | any) {
      if (error instanceof DNSProviderError) {
        this.logger.error('Unable to create DNS record', error, {
          provider: error.provider,
          code: error.code,
        });

        throw error;
      }

      throw error;
    }
  }

  async updateRecord(input: UpdateRecordInput): Promise<DNSRecord> {
    this.logger.info(`Updating ${input.type} record ${input.name}`, {
      ...input,
    });
    try {
      const record = await this.provider.updateRecord(input);

      return record;
    } catch (error: DNSProviderError | Error | any) {
      if (error instanceof DNSProviderError) {
        this.logger.error('Unable to update DNS record', error, {
          provider: error.provider,
          code: error.code,
        });

        throw error;
      }

      throw error;
    }
  }

  async deleteRecord(input: FindRecordInput): Promise<void> {
    this.logger.info(`Deleting ${input.type} record ${input.name}`, {
      ...input,
    });

    try {
      await this.provider.deleteRecord(input);
    } catch (error: DNSProviderError | Error | any) {
      if (error instanceof DNSProviderError) {
        this.logger.error('Unable to delete DNS record', error, {
          provider: error.provider,
          code: error.code,
        });

        throw error;
      }

      throw error;
    }
  }

  async findRecordByName(
    name: string,
    type?: string,
  ): Promise<DNSRecord | null> {
    this.logger.info(`Finding ${type} record ${name}`);
    try {
      const record = await this.provider.findRecord({
        name,
        type: type as DNSRecordType,
      });

      return record;
    } catch (error: DNSProviderError | Error | any) {
      if (error instanceof DNSProviderError) {
        this.logger.error('Unable to find DNS record', error, {
          provider: error.provider,
          code: error.code,
        });

        throw error;
      }

      throw error;
    }
  }
}
