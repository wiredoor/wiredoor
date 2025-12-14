import { ObjectSchema, ValidationError } from 'joi';
import Joi from './joi-validator';
import { FilterQueryDto } from '../repositories/filters/repository-query-filter';
import { isValidDomain } from './domain-validator';
import Container from 'typedi';
import { DomainRepository } from '../repositories/domain-repository';

export const validateServiceDomain = async (c: string): Promise<string> => {
  const domain = await Container.get(DomainRepository).getDomainByName(c);

  if (domain) {
    return c;
  }

  const { error } = Joi.string().domain().validate(c);

  if (error) {
    throw new ValidationError(
      `invalid domain`,
      [
        {
          path: ['domain'],
          message: `This field must contain a valid domain name`,
          type: 'Error',
        },
      ],
      null,
    );
  }

  const valid = await isValidDomain(c);

  if (!valid) {
    throw new ValidationError(
      `nslookup failed`,
      [
        {
          path: ['domain'],
          message: `Domain verification failed. The domain does not point to Wiredoor host.`,
          type: 'Error',
        },
      ],
      null,
    );
  }

  return c;
};

const validateBypassPaths = (input: string): string => {
  if (!input) return '';

  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const forbiddenChars = new RegExp(`["'\`;&<>\\\\]|[\\x00-\\x1F]`);

  for (const [i, line] of lines.entries()) {
    const lineNum = i + 1;

    if (/^[A-Z]+!?=/.test(line)) {
      throw new ValidationError(
        `invalid method prefix at line ${lineNum}`,
        [
          {
            path: ['skipAuthRoutes'],
            message: `Line ${lineNum} should not contain HTTP method or operator prefix: "${line}"`,
            type: 'bypass.path.invalidPrefix',
          },
        ],
        input,
      );
    }

    if (forbiddenChars.test(line)) {
      throw new ValidationError(
        `forbidden characters at line ${lineNum}`,
        [
          {
            path: ['skipAuthRoutes'],
            message: `Line ${lineNum} contains forbidden characters: "${line}"`,
            type: 'bypass.path.forbiddenChar',
          },
        ],
        input,
      );
    }

    if (line.startsWith('^')) {
      try {
        new RegExp(line);
      } catch {
        throw new ValidationError(
          `invalid regex at line ${lineNum}`,
          [
            {
              path: ['skipAuthRoutes'],
              message: `Line ${lineNum} is not a valid regular expression: "${line}"`,
              type: 'bypass.path.invalidRegex',
            },
          ],
          input,
        );
      }
    } else {
      if (!line.startsWith('/')) {
        throw new ValidationError(
          `invalid path at line ${lineNum}`,
          [
            {
              path: ['skipAuthRoutes'],
              message: `Line ${lineNum} must start with '/' or '^': "${line}"`,
              type: 'bypass.path.invalidPath',
            },
          ],
          input,
        );
      }

      if (/\s/.test(line)) {
        throw new ValidationError(
          `path contains whitespace at line ${lineNum}`,
          [
            {
              path: ['skipAuthRoutes'],
              message: `Line ${lineNum} contains whitespace and is not valid: "${line}"`,
              type: 'bypass.path.whitespace',
            },
          ],
          input,
        );
      }
    }
  }

  return input;
};

export const ttlValidator = Joi.string()
  .pattern(/^\d+\s*(s|m|h|d)$/)
  .allow('')
  .message('TTL must be a string like "30s", "10m", "2h", "1d"')
  .optional();

export interface HttpServiceType {
  name: string;
  domain?: string;
  pathLocation?: string;
  backendHost?: string;
  backendPort?: number;
  backendProto?: string;
  allowedIps?: string[];
  blockedIps?: string[];
  requireAuth?: boolean;
  skipAuthRoutes?: string;
  enabled?: boolean;
  ttl?: string;
  expiresAt?: Date;
}

export interface HttpServiceFilterQueryParams extends FilterQueryDto {
  limit?: number;
  page?: number;
  orderBy?: string;
  nodeId?: number;
  domain?: string;
}

export const httpServiceFilterValidator: ObjectSchema<HttpServiceFilterQueryParams> =
  Joi.object({
    limit: Joi.number().optional(),
    page: Joi.number().optional(),
    orderBy: Joi.string()
      .pattern(/,(asc|desc)$/)
      .optional(),
    nodeId: Joi.number().optional(),
    domain: Joi.string().optional(),
  });

export const httpServiceValidator: ObjectSchema<HttpServiceType> = Joi.object({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  domain: Joi.string()
    .allow(null, '')
    .external(validateServiceDomain)
    .optional(),
  pathLocation: Joi.string().pattern(/^\/.*/).optional(),
  backendProto: Joi.string().valid('http', 'https').allow(null).optional(),
  backendHost: Joi.string().allow(null).invalid('localhost').optional(),
  backendPort: Joi.number().port().optional(),
  allowedIps: Joi.array()
    .items(Joi.string().ip({ cidr: 'optional' }).optional())
    .allow(null)
    .optional(),
  blockedIps: Joi.array()
    .items(Joi.string().ip({ cidr: 'optional' }).optional())
    .allow(null)
    .optional(),
  requireAuth: Joi.boolean().when('domain', {
    is: Joi.string(),
    then: Joi.boolean().allow(null).optional(),
    otherwise: Joi.boolean().valid(false).allow(null).optional(),
  }),
  skipAuthRoutes: Joi.when('requireAuth', {
    is: true,
    then: Joi.string().external(validateBypassPaths).allow('', null).optional(),
  }),
  ttl: ttlValidator,
}).or('domain', 'pathLocation');
