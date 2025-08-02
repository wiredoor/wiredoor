import { ObjectSchema, ValidationError } from 'joi';
import Joi from './joi-validator';
import { FilterQueryDto } from '../repositories/filters/repository-query-filter';
import IP_CIDR from '../utils/ip-cidr';
import { GatewayNetwork } from '../database/models/node';
import Net from '../utils/net';

export const validateSubnet = async (c: string): Promise<string> => {
  if (c) {
    const wireguardIp = await Net.getWireguardIP();

    if (
      IP_CIDR.isValidIP(wireguardIp) &&
      IP_CIDR.belongsToSubnet(wireguardIp, c)
    ) {
      throw new ValidationError(
        `subnet validation failed`,
        [
          {
            path: ['gatewayNetwork'],
            message: `Gateway subnet shouldn't include Wiredoor IP`,
            type: 'Error',
          },
        ],
        null,
      );
    }
  }

  return c;
};

export const validateGatewayNetworks = async (
  networks: GatewayNetwork[],
): Promise<GatewayNetwork[]> => {
  const seenInterfaces = new Set<string>();

  const wireguardIp = await Net.getWireguardIP();

  for (const [index, net] of networks.entries()) {
    if (seenInterfaces.has(net.interface)) {
      throw new ValidationError(
        `Duplicate interface "${net.interface}" at index ${index}`,
        [
          {
            path: [`gatewayNetworks`],
            message: `Interface "${net.interface}" is duplicated`,
            type: 'any.duplicate',
          },
        ],
        null,
      );
    }
    seenInterfaces.add(net.interface);

    if (
      IP_CIDR.isValidIP(wireguardIp) &&
      IP_CIDR.belongsToSubnet(wireguardIp, net.subnet)
    ) {
      throw new ValidationError(
        `Subnet at index ${index} includes Wiredoor IP`,
        [
          {
            path: [`gatewayNetworks`],
            message: `Gateway subnet shouldn't include Wiredoor IP`,
            type: 'subnet.invalid',
          },
        ],
        null,
      );
    }
  }

  return networks;
};

export const gatewayNetworkValidator = Joi.string()
  .ip({ cidr: 'required' })
  .external(validateSubnet)
  .required();

export const gatewayNetworksValidator = Joi.array()
  .items(
    Joi.object({
      interface: Joi.string().required(),
      subnet: Joi.string().ip({ cidr: 'required' }).required(),
    }),
  )
  .external(validateGatewayNetworks)
  .required();

export interface NodeFilterQueryParams extends FilterQueryDto {
  limit?: number;
  page?: number;
  orderBy?: string;
  type?: 'nodes' | 'gateways';
  wgInterface?: string;
}

export interface NodeFilterStreamParams extends NodeFilterQueryParams {
  token?: string;
}

export interface CreateNodeType {
  name: string;
  dns?: string;
  keepalive?: number;
  address?: string;
  interface?: string;
  allowInternet?: boolean;
  advanced?: boolean;
  enabled?: boolean;
  gatewayNetworks?: GatewayNetwork[];
  isGateway?: boolean;
}

export interface NodeClientParams extends CreateNodeType {
  wgInterface: string;
  preSharedKey: string;
  publicKey: string;
  privateKey: string;
  clientIp?: string;
  latestHandshakeTimestamp?: number;
  transferRx?: number;
  transferTx?: number;
  status?: 'online' | 'offline' | 'idle';
}

export const nodeFilterValidator: ObjectSchema<NodeFilterQueryParams> =
  Joi.object({
    limit: Joi.number().optional(),
    page: Joi.number().optional(),
    orderBy: Joi.string()
      .pattern(/,(asc|desc)$/)
      .optional(),
    type: Joi.string().valid('nodes', 'gateways').optional(),
  });

export const createNodeValidator: ObjectSchema<CreateNodeType> = Joi.object({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  dns: Joi.string()
    .custom((value, helpers) => {
      const ips = value.split(/[,\s]+/).filter(Boolean);
      for (const ip of ips) {
        const valid = Joi.attempt(
          ip,
          Joi.string().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }),
        );
        if (!valid) return helpers.error('any.invalid');
      }
      return value;
    }, 'DNS list validation')
    .optional()
    .allow('', null)
    .label('DNS Servers')
    .messages({
      'any.invalid': 'Each DNS entry must be a valid IP address (IPv4 or IPv6)',
    }),
  keepalive: Joi.number()
    .integer()
    .min(0)
    .max(120)
    .default(25)
    .optional()
    .label('Persistent Keepalive'),
  address: Joi.string()
    .allow('')
    .ip({ version: 'ipv4', cidr: 'forbidden' })
    .optional(),
  allowInternet: Joi.boolean().optional(),
  isGateway: Joi.boolean().optional(),
  advanced: Joi.boolean().optional(),
  gatewayNetworks: Joi.when('isGateway', {
    is: true,
    then: gatewayNetworksValidator,
    otherwise: Joi.valid(null).optional(),
  }),
  // interface: Joi.string().optional(),
  // enabled: Joi.boolean().optional(),
});
