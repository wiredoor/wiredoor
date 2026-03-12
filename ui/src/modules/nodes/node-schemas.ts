import Joi, { ObjectSchema } from 'joi';
import { FilterQueryDto } from '../../types/api';

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

export interface GatewayNetwork {
  interface: string;
  subnet: string;
}

export interface CreateNodeType {
  id?: number;
  name: string;
  dns?: string;
  mtu?: number;
  keepalive?: number;
  address?: string;
  interface?: string;
  allowInternet?: boolean;
  advanced?: boolean;
  enabled?: boolean;
  gatewayNetworks?: GatewayNetwork[];
  isGateway?: boolean;
}

export interface NodeInfo extends CreateNodeType {
  id: number;
  wgInterface: string;
  cliVersion?: string;
  clientIp?: string;
  latestHandshakeTimestamp?: number;
  transferRx?: number;
  transferTx?: number;
  connectedAt?: Date;
  disconnectedAt?: Date;
  status?: 'online' | 'offline' | 'idle';
}

export interface NodeWithToken extends NodeInfo {
  token: string;
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

export const nodeFilterValidator: ObjectSchema<NodeFilterQueryParams> = Joi.object({
  limit: Joi.number().optional(),
  page: Joi.number().optional(),
  orderBy: Joi.string()
    .pattern(/,(asc|desc)$/)
    .optional(),
  type: Joi.string().valid('', 'nodes', 'gateways').optional(),
  status: Joi.string().valid('', 'online', 'offline', 'enabled', 'disabled').optional(),
  search: Joi.string().optional(),
});

export const createNodeValidator = Joi.object<CreateNodeType>({
  id: Joi.number().optional(),
  name: Joi.string().required().label('Name'),
  dns: Joi.string().allow('', null).optional().label('DNS'),
  keepalive: Joi.number().optional().label('Keepalive'),
  mtu: Joi.number().allow(null).integer().min(1280).max(1440).optional().label('MTU'),
  address: Joi.string()
    .ip({ version: 'ipv4', cidr: 'forbidden' })
    .when('id', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional().allow('', null),
    })
    .label('IP Address'),
  allowInternet: Joi.boolean().optional(),
  advanced: Joi.boolean().optional(),
  isGateway: Joi.boolean().optional(),
  gatewayNetworks: Joi.array()
    .items(
      Joi.object({
        interface: Joi.string().required().label('Interface'),
        subnet: Joi.string().ip({ cidr: 'required' }).required().label('Subnet'),
      }),
    )
    .allow(null)
    .optional(),
});
