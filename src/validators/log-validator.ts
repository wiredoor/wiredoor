import Joi from './joi-validator';

export interface LogQueryParams {
  domain?: string;
  type?: 'tcp' | 'http';
  id?: string;
}

export interface LogStreamQueryParams extends LogQueryParams {
  token?: string;
}

export const logParamsValidator = Joi.object({
  domain: Joi.string().domain().optional(),
  token: Joi.string().optional(),
  type: Joi.string().allow('tcp', 'http').optional(),
  id: Joi.string().optional(),
});
