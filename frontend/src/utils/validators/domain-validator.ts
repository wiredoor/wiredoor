import { ValidationError, type ObjectSchema } from 'joi'
import Joi from './joi-validator'

export interface DomainForm {
  id?: number
  domain: string
  ssl?: string
  skipValidation?: boolean
  authentication?: boolean
  allowedEmails?: string[]
  skipAuthRoutes?: string
}

export interface Domain extends DomainForm {
  created_at?: string
  updated_at?: string
}

function validateSkipAuthRoute(input: string): string {
  if (!input) return ''

  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const forbiddenChars = new RegExp(`["'\`;|&<>\\\\\`]|[\\x00-\\x1F]`, 'g')

  for (const [i, line] of lines.entries()) {
    if (forbiddenChars.test(line)) {
      throw new ValidationError(
        `invalid character at line ${i + 1}`,
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
    const cleaned = line.replace(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)?!?=?/, '')

    try {
      new RegExp(cleaned)
    } catch {
      throw new ValidationError(
        `invalid path at line ${i + 1}`,
        [
          {
            path: ['skipAuthRoutes'],
            message: `Invalid path regex at line ${i + 1}: "${line}"`,
            type: 'Error',
          },
        ],
        null,
      )
    }
  }

  return input
}

export const domainValidator: ObjectSchema<DomainForm> = Joi.object({
  domain: Joi.string()
    .pattern(new RegExp(`^([a-zA-Z0-9-]+\\.)+([a-zA-Z]{2,})$`), 'domain')
    .required()
    .messages({
      'string.pattern.any': 'The domain must be in a valid format',
      'string.empty': 'The domain field is required',
    }),
  ssl: Joi.string().when('validation', {
    is: false,
    then: Joi.valid('self-signed').allow(null).optional(),
    otherwise: Joi.valid('self-signed', 'certbot').allow(null).optional(),
  }),
  skipValidation: Joi.boolean().optional(),
  authentication: Joi.boolean().optional(),
  allowedEmails: Joi.array()
    .items(
      Joi.string()
        .email({ tlds: { allow: false } })
        .optional(),
    )
    .allow(null)
    .optional(),
  skipAuthRoutes: Joi.string().when('authentication', {
    is: true,
    then: Joi.string().external(validateSkipAuthRoute).optional(),
  }),
})
