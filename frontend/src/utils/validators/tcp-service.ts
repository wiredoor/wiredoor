import type { ObjectSchema } from 'joi'
import Joi from './joi-validator'

export interface TcpService {
  id?: number
  name: string
  domain?: string
  proto: string
  backendHost?: string
  backendPort: number
  port?: number
  ssl?: boolean
  allowedIps?: string[]
  blockedIps?: string[]
  node?: Node
  publicAccess?: string
}

export interface TcpServiceForm {
  id?: number
  name: string
  domain?: string
  proto: string
  backendHost?: string
  backendPort: number
  port?: number
  ssl?: boolean
  allowedIps?: string[]
  blockedIps?: string[]
}

export const tcpServiceValidator: ObjectSchema<TcpServiceForm> = Joi.object({
  name: Joi.string().required(),
  domain: Joi.string()
    .domain({ tlds: { allow: ['local', 'test', 'lan', 'internal'] } })
    .allow(null, '')
    .optional(),
  proto: Joi.string().valid('tcp', 'udp').allow(null).optional(),
  backendHost: Joi.string().allow(null).optional(),
  backendPort: Joi.number().port().required(),
  port: Joi.number().optional(),
  ssl: Joi.boolean().optional(),
  allowedIps: Joi.array()
    .items(Joi.string().ip({ cidr: 'optional' }).optional())
    .allow(null)
    .optional(),
  blockedIps: Joi.array()
    .items(Joi.string().ip({ cidr: 'optional' }).optional())
    .allow(null)
    .optional(),
})
