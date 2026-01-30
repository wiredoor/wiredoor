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
  mtu: Joi.number().integer().min(1280).max(1440).optional().label('MTU'),
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
