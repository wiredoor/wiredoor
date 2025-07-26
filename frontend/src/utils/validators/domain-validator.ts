import { type ObjectSchema } from 'joi'
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
})
