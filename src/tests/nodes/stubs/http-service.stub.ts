import { faker } from '@faker-js/faker';
import { HttpServiceType } from '../../../validators/http-service-validator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeHttpServiceData = (params?: any): HttpServiceType => {
  return {
    name: params?.name || faker.internet.domainWord(),
    domain: params?.domain || faker.internet.domainName(),
    pathLocation: params?.pathLocation || '/',
    backendProto: params?.backendProto || 'http',
    backendPort: params?.backendPort || 80,
    allowedIps: params?.allowedIps || [],
    blockedIps: params?.allowedIps || [],
  };
};
