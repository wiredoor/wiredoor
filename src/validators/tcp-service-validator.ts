import { ObjectSchema } from 'joi';
import Joi from './joi-validator';
import config from '../config';
import { FilterQueryDto } from '../repositories/filters/repository-query-filter';
import { ttlValidator, validateServiceDomain } from './http-service-validator';

export interface TcpServiceType {
  name: string;
  domain?: string;
  proto: string;
  backendHost?: string;
  backendPort: number;
  port?: number;
  ssl?: boolean;
  allowedIps?: string[];
  blockedIps?: string[];
  enabled?: boolean;
  ttl?: string;
  expiresAt?: Date;
}

export interface TcpServiceFilterQueryParams extends FilterQueryDto {
  limit?: number;
  page?: number;
  orderBy?: string;
  nodeId?: number;
  domain?: string;
}

const tcpServicePortValidator = Joi.number()
  .integer()
  .min(1)
  .max(65535)
  .custom((port, helpers) => {
    const [min, configuredMax] = config.server.port_range
      ? config.server.port_range.split('-').map(Number)
      : [];
    const max = configuredMax || min;
    const additionalPorts = config.server.additional_ports
      ? config.server.additional_ports.split(',').map(Number)
      : [];

    if ((min && port >= min && port <= max) || additionalPorts.includes(port)) {
      return port;
    }

    return helpers.message({
      custom: `Port ${port} is not within the allowed range`,
    });
  });

export const tcpServiceFilterValidator: ObjectSchema<TcpServiceFilterQueryParams> =
  Joi.object({
    limit: Joi.number().optional(),
    page: Joi.number().optional(),
    orderBy: Joi.string()
      .pattern(/,(asc|desc)$/)
      .optional(),
    nodeId: Joi.number().optional(),
    domain: Joi.string().optional(),
  });

export const tcpServiceValidator: ObjectSchema<TcpServiceType> = Joi.object({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  domain: Joi.string()
    .allow(null, '')
    .external(validateServiceDomain)
    .optional(),
  proto: Joi.string().valid('tcp', 'udp').allow(null).optional(),
  backendHost: Joi.string()
    .allow(null)
    .invalid('localhost', '127.0.0.1')
    .optional(),
  backendPort: Joi.number().port().required(),
  port: tcpServicePortValidator.optional(),
  ssl: Joi.boolean().optional(),
  allowedIps: Joi.array()
    .items(Joi.string().ip({ cidr: 'optional' }).optional())
    .allow(null)
    .optional(),
  blockedIps: Joi.array()
    .items(Joi.string().ip({ cidr: 'optional' }).optional())
    .allow(null)
    .optional(),
  ttl: ttlValidator,
});
