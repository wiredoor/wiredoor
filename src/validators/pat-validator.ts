import { ObjectSchema } from 'joi';
import Joi from '../utils/joi-validator';
import { FilterQueryDto } from '../schemas/shared-schemas';

export interface CreatePATType {
  name: string;
  exapireAt?: string;
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
