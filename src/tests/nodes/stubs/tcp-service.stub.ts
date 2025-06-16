import { faker } from '@faker-js/faker';
import { TcpServiceType } from '../../../validators/tcp-service-validator';
import config from '../../../config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeTcpServiceData = (params?: any): TcpServiceType => {
  let min = 15000;
  let max = 16000;

  if (config.server.port_range) {
    min = +config.server.port_range.split('-')[0];
    max = +config.server.port_range.split('-')[1];
  }

  return {
    name: params?.name || faker.internet.domainWord(),
    domain: params?.domain || faker.internet.domainName(),
    proto: params?.proto || 'tcp',
    backendHost: params?.backendHost || null,
    backendPort: params?.backendPort || faker.internet.port(),
    port: params?.port || faker.number.int({ min, max }),
    ssl: params?.ssl || false,
    allowedIps: params?.allowedIps || [],
  };
};
