import { Service } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import {
  Body,
  CurrentUser,
  Delete,
  Get,
  JsonController,
  NotFoundError,
  Param,
  Patch,
  Post,
  QueryParams,
  Req,
  UseBefore,
} from 'routing-controllers';
import { Request } from 'express';

import BaseController from './base-controller';

import { HttpResourceService } from '../services/http-resources/http-resource-service';
import { HttpResource } from '../database/models/http-resource';

import {
  HttpResourceFilterQueryParams,
  httpResourceFilterValidator,
  HttpResourceType,
  httpResourceValidator,
} from '../schemas/http-resource-schemas';

import { PagedData } from '../schemas/shared-schemas';
import { AuthWebHandler } from '../middlewares/auth-web-handler';
import { User } from '../database/models/user';

@Service()
@JsonController('/http')
@UseBefore(AuthWebHandler)
export default class HttpResourceController extends BaseController {
  constructor(private readonly httpResourceService: HttpResourceService) {
    super();
  }

  @Get('/')
  @UseBefore(
    celebrate({
      query: httpResourceFilterValidator,
    }),
  )
  async getHttpResources(
    @QueryParams() filters: HttpResourceFilterQueryParams,
  ): Promise<HttpResource | HttpResource[] | PagedData<HttpResource>> {
    return this.httpResourceService.getHttpResources(filters);
  }

  @Post('/')
  @UseBefore(
    celebrate({
      body: httpResourceValidator,
    }),
  )
  async createHttpResource(
    @Body() params: HttpResourceType,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: User,
  ): Promise<HttpResource> {
    req.logger.audit(`Creating new http-resource`, {
      userId: user.id,
      userName: user.name,
    });
    return this.httpResourceService.createHttpResource(params);
  }

  @Get('/:id')
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async getHttpResource(@Param('id') id: string): Promise<HttpResource> {
    const resource = await this.httpResourceService.getHttpResource(+id);

    if (!resource) {
      throw new NotFoundError('Http Resource not found');
    }

    return resource;
  }

  @Patch('/:id')
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
      body: httpResourceValidator,
    }),
  )
  async updateHttpResource(
    @Param('id') id: string,
    @Body() params: HttpResourceType,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: User,
  ): Promise<HttpResource> {
    req.logger.audit(`Updating http-resource with id ${id}`, {
      id,
      userId: user.id,
      userName: user.name,
      params,
    });

    const resource = await this.httpResourceService.updateHttpResource(
      +id,
      params,
    );

    if (!resource) {
      throw new NotFoundError('Http Resource not found');
    }

    return resource;
  }

  @Delete('/:id')
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async deleteHttpResource(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: User,
  ): Promise<string> {
    req.logger.audit(`Deleting http-resource with id ${id}`, {
      id,
      userId: user.id,
      userName: user.name,
    });
    return this.httpResourceService.deleteHttpResource(+id);
  }
}
