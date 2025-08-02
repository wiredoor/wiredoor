import { faker } from '@faker-js/faker';
import { CreateNodeType } from '../../../validators/node-validators';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeNodeData = (params?: any): CreateNodeType => {
  return {
    name: params?.name || faker.internet.domainWord(),
    address: params?.address || faker.internet.ipv4(),
    interface: params?.interface || 'wg0',
    allowInternet: params?.allowInternet || false,
    isGateway: params?.isGateway || false,
    gatewayNetworks: params?.gatewayNetworks || null,
    enabled: params?.enabled !== undefined ? params.enabled : true,
  };
};
