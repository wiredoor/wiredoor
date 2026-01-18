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
import { Resolver } from 'node:dns/promises';
import ServerUtils from '../../utils/server';

@Service()
export class DNSService {
  private readonly logger: ILogger;

  constructor(
    @Inject(DNSProviderToken) private readonly provider: DNSProvider,
  ) {
    this.logger = createLogger({ serviceName: 'DNSService' });
  }

  async waitUntilResolvesTo(
    fqdn: string,
    expectedIp: string,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
      servers?: string[];
    } = {},
  ): Promise<void> {
    const {
      timeoutMs = 60_000,
      intervalMs = 2_000,
      servers = ['1.1.1.1', '8.8.8.8'],
    } = options;

    const resolver = new Resolver();
    resolver.setServers(servers);

    const start = Date.now();

    while (true) {
      try {
        const addresses = await resolver.resolve4(fqdn);

        if (addresses.includes(expectedIp)) {
          return;
        }
      } catch {
        // empty
      }

      if (Date.now() - start > timeoutMs) {
        const error = new Error(
          `DNS propagation timeout: ${fqdn} did not resolve to ${expectedIp} within ${timeoutMs}ms`,
        );
        this.logger.error('DNS propagation timeout', error, {
          message: error.message,
          fqdn,
          expectedIp,
        });
        throw error;
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  async waitUntilHttpOk(
    fqdn: string,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
      servers?: string[];
    } = {},
  ): Promise<void> {
    const started = Date.now();

    while (true) {
      try {
        const isOk = await ServerUtils.verifyDomainHttp01(fqdn);

        if (isOk) {
          return;
        }
      } catch {
        // empty
      }

      if (Date.now() - started > (options.timeoutMs ?? 60000)) {
        const error = new Error(
          `HTTP verification timeout: ${fqdn} did not return a successful response within ${options.timeoutMs ?? 60000}ms`,
        );
        this.logger.error('HTTP verification timeout', error, {
          message: error.message,
          fqdn,
        });
        throw error;
      }

      await new Promise((r) => setTimeout(r, options.intervalMs ?? 2000));
    }
  }

  async canManageDomain(domain: string): Promise<boolean> {
    return this.provider.canManageDomain(domain);
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
