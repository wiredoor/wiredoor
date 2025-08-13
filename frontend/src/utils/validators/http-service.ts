import { ValidationError, type ObjectSchema } from 'joi'
import Joi from './joi-validator'
import type { Node } from './node-validator'

export interface HttpService {
  id?: number
  name: string
  domain?: string
  pathLocation?: string
  backendHost?: string
  backendPort?: number
  backendProto?: string
  allowedIps?: string[]
  blockedIps?: string[]
  node?: Node
  publicAccess?: string
}

export interface HttpServiceForm {
  id?: number
  name: string
  domain?: string
  pathLocation?: string
  backendHost?: string
  backendPort?: number
  backendProto?: string
  allowedIps?: string[]
  blockedIps?: string[]
  requireAuth?: boolean
  skipAuthRoutes?: string
}

function validateNginxBypassPaths(input: string): string {
  if (!input) return ''

  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const forbidden = new RegExp(`["'\`;&<>\\\\\`]|[\\x00-\\x1F]`)

  for (const [i, line] of lines.entries()) {
    if (line.match(/^[A-Z]+!?=/)) {
      throw new ValidationError(
        `Invalid method prefix at line ${i + 1}`,
        [
          {
            path: ['skipAuthRoutes'],
            message: `Line ${i + 1} should not contain HTTP method or '!=' prefix: "${line}"`,
            type: 'Error',
          },
        ],
        null,
      )
    }

    if (forbidden.test(line)) {
      throw new ValidationError(
        `Forbidden character at line ${i + 1}`,
        [
          {
            path: ['skipAuthRoutes'],
            message: `Line ${i + 1} contains forbidden characters: "${line}"`,
            type: 'Error',
          },
        ],
        null,
      )
    }

    if (line.startsWith('^')) {
      try {
        new RegExp(line)
      } catch {
        throw new ValidationError(
          `Invalid regex at line ${i + 1}`,
          [
            {
              path: ['skipAuthRoutes'],
              message: `Line ${i + 1} is not a valid regular expression: "${line}"`,
              type: 'Error',
            },
          ],
          null,
        )
      }
    } else {
      // Validar que sea un path válido (opcional)
      if (!line.startsWith('/')) {
        throw new ValidationError(
          `Invalid path at line ${i + 1}`,
          [
            {
              path: ['skipAuthRoutes'],
              message: `Line ${i + 1} must start with '/' or '^': "${line}"`,
              type: 'Error',
            },
          ],
          null,
        )
      }
    }
  }

  return input
}

export const httpServiceValidator: ObjectSchema<HttpServiceForm> = Joi.object({
  name: Joi.string().required(),
  domain: Joi.string()
    .pattern(new RegExp(`^([a-zA-Z0-9-]+\\.)+([a-zA-Z]{2,})$`), 'domain structure')
    .allow(null, '')
    .optional(),
  pathLocation: Joi.string().pattern(/^\/.*/).optional(),
  backendProto: Joi.string().valid('http', 'https').allow(null).optional(),
  backendHost: Joi.string().allow(null).optional(),
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
    is: Joi.string().domain(),
    then: Joi.boolean().allow(null).optional(),
    otherwise: Joi.boolean().valid(false).allow(null).optional(),
  }),
  skipAuthRoutes: Joi.string().when('requireAuth', {
    is: true,
    then: Joi.string().external(validateNginxBypassPaths).allow('', null).optional(),
  }),
}).or('domain', 'pathLocation')
