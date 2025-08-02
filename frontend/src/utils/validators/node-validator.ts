import Joi from './joi-validator'
import type { PAT } from './token-validator'

export interface GatewayNetwork {
  interface: string
  subnet: string
}

export interface Node {
  clientIp?: string
  id: number
  name: string
  address: string
  dns?: string
  keepalive?: number
  wgInterface: string
  allowedIPs: string
  enabled: boolean
  isGateway: boolean
  isLocal?: boolean
  allowInternet?: boolean
  advanced?: boolean
  gatewayNetworks?: GatewayNetwork[] | null | undefined
  latestHandshakeTimestamp?: number
  transferRx?: number
  transferTx?: number
  status?: string
  token?: string
  personalAccessTokens?: PAT[]
  created_at: string
  updated_at: string
}

export interface NodeForm {
  id?: number
  name: string
  dns?: string
  address?: string
  keepalive?: number
  allowInternet?: boolean
  advanced?: boolean
  isGateway?: boolean
  gatewayNetworks?: GatewayNetwork[] | null | undefined
}

export const nodeValidator = Joi.object<NodeForm>({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  dns: Joi.string().allow('', null).optional(),
  keepalive: Joi.number().optional(),
  address: Joi.string().allow('').ip({ version: 'ipv4', cidr: 'forbidden' }).optional(),
  allowInternet: Joi.boolean().optional(),
  advanced: Joi.boolean().optional(),
  isGateway: Joi.boolean().optional(),
  gatewayNetworks: Joi.array()
    .items(
      Joi.object({
        interface: Joi.string().required(),
        subnet: Joi.string().ip({ cidr: 'required' }).required(),
      }),
    )
    .allow(null)
    .optional(),
})
