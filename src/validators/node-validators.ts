import { ObjectSchema, ValidationError } from 'joi';
import Joi from './joi-validator';
import { FilterQueryDto } from '../repositories/filters/repository-query-filter';
import IP_CIDR from '../utils/ip-cidr';
import config from '../config';

export const validateSubnet = async (c: string): Promise<string> => {
  if (c) {
    if (
      IP_CIDR.isValidIP(config.wireguard.host) &&
      IP_CIDR.belongsToSubnet(config.wireguard.host, c)
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

export const gatewayNetworkValidator = Joi.string()
  .ip({ cidr: 'required' })
  .external(validateSubnet)
  .required();

export interface NodeFilterQueryParams extends FilterQueryDto {
  limit?: number;
  page?: number;
  orderBy?: string;
  type?: 'nodes' | 'gateways';
}

export interface NodeFilterStreamParams extends NodeFilterQueryParams {
  token?: string;
}

export interface CreateNodeType {
  name: string;
  address?: string;
  interface?: string;
  allowInternet?: boolean;
  enabled?: boolean;
  gatewayNetwork?: string;
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
  address: Joi.string()
    .allow('')
    .ip({ version: 'ipv4', cidr: 'forbidden' })
    .optional(),
  allowInternet: Joi.boolean().optional(),
  isGateway: Joi.boolean().optional(),
  gatewayNetwork: Joi.string().when('isGateway', {
    is: true,
    then: gatewayNetworkValidator,
    otherwise: Joi.valid(null, '').optional(),
  }),
  // interface: Joi.string().optional(),
  // enabled: Joi.boolean().optional(),
});
