import { faker } from '@faker-js/faker';
import { CreatePATType } from '../../../validators/pat-validator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makePATData = (params?: any): CreatePATType => {
  return {
    name: params?.name || faker.internet.domainWord(),
    expireAt: params?.expireAt || null,
    revoked: params?.revoked || false,
  };
};
