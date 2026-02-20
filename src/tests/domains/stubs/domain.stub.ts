import { faker } from '@faker-js/faker';
import { DomainType } from '../../../schemas/domain-schemas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeDomainData = (params?: any): DomainType => {
  return {
    domain: params?.domain || faker.internet.domainName(),
    ssl: params?.ssl || 'self-signed',
    authentication: params?.authentication || false,
    allowedEmails: params?.authentication
      ? params?.allowedEmails || [faker.internet.email()]
      : null,
  };
};
