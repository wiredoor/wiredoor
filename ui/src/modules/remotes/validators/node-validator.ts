import Joi from 'joi';

export interface GatewayNetwork {
  interface: string;
  subnet: string;
}

export interface NodeForm {
  id?: number;
  name: string;
  dns?: string;
  address?: string;
  mtu?: number;
  keepalive?: number;
  allowInternet?: boolean;
  advanced?: boolean;
  isGateway?: boolean;
  gatewayNetworks?: GatewayNetwork[] | null | undefined;
}

export const nodeValidator = Joi.object<NodeForm>({
  id: Joi.number().optional(),
  name: Joi.string().required().label('Name'),
  dns: Joi.string().allow('', null).optional().label('DNS'),
  keepalive: Joi.number().optional(),
  mtu: Joi.number().optional(),
  address: Joi.string()
    .when('id', {
      is: undefined,
      then: Joi.string().allow('').ip({ version: 'ipv4', cidr: 'forbidden' }).optional(),
      otherwise: Joi.string().ip({ version: 'ipv4', cidr: 'forbidden' }).required(),
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
