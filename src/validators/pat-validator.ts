import { ObjectSchema } from 'joi';
import Joi from './joi-validator';
import { FilterQueryDto } from '../repositories/filters/repository-query-filter';

export interface CreatePATType {
  name: string;
  expireAt?: string | Date;
  revoked?: boolean;
}

export interface PatFilterQueryParams extends FilterQueryDto {
  limit?: number;
  page?: number;
  orderBy?: string;
  nodeId?: number;
}

export const patFilterValidator: ObjectSchema<PatFilterQueryParams> =
  Joi.object({
    limit: Joi.number().optional(),
    page: Joi.number().optional(),
    orderBy: Joi.string()
      .pattern(/,(asc|desc)$/)
      .optional(),
    nodeId: Joi.number().optional(),
  });

export const createPATValidator: ObjectSchema<CreatePATType> = Joi.object({
  name: Joi.string().required(),
  expireAt: Joi.string().optional(),
});
