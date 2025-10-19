import {
  Authorized,
  Body,
  Delete,
  Get,
  JsonController,
  Param,
  Patch,
  Post,
  QueryParam,
  QueryParams,
  UseBefore,
} from 'routing-controllers';
import { Inject, Service } from 'typedi';
import Joi from 'joi';
import { celebrate } from 'celebrate';
import BaseController from './base-controller';
import {
  HttpServiceFilterQueryParams,
  httpServiceFilterValidator,
  HttpServiceType,
  httpServiceValidator,
} from '../validators/http-service-validator';
import {
  TcpServiceFilterQueryParams,
  tcpServiceFilterValidator,
  TcpServiceType,
  tcpServiceValidator,
} from '../validators/tcp-service-validator';
import { HttpServicesService } from '../services/http-services-service';
import { TcpServicesService } from '../services/tcp-services-service';
import { HttpService } from '../database/models/http-service';
import { PagedData } from '../repositories/filters/repository-query-filter';
import { TcpService } from '../database/models/tcp-service';
import { AdminTokenHandler } from '../middlewares/admin-token-handler';
import { ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER } from '../utils/constants';

@Service()
@JsonController('/services')
@UseBefore(AdminTokenHandler)
export default class NodeServiceController extends BaseController {
  constructor(
    @Inject() private readonly httpServicesService: HttpServicesService,
    @Inject() private readonly tcpServicesService: TcpServicesService,
  ) {
    super();
  }

  @Get('/http')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  @UseBefore(
    celebrate({
      query: httpServiceFilterValidator,
    }),
  )
  async getHttpServices(
    @QueryParams() filters: HttpServiceFilterQueryParams,
  ): Promise<HttpService | HttpService[] | PagedData<HttpService>> {
    return this.httpServicesService.getHttpServices(filters);
  }

  @Get('/:nodeId/http')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  @UseBefore(
    celebrate({
      params: Joi.object({ nodeId: Joi.string().required() }),
      query: httpServiceFilterValidator,
    }),
  )
  async getNodeHttpServices(
    @Param('nodeId') nodeId: string,
    @QueryParams() params: HttpServiceFilterQueryParams,
  ): Promise<HttpService | PagedData<HttpService> | HttpService[]> {
    return this.httpServicesService.getNodeHttpServices(+nodeId, params);
  }

  @Post('/:nodeId/http')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ nodeId: Joi.string().required() }),
      body: httpServiceValidator,
    }),
  )
  async createNodeService(
    @Param('nodeId') nodeId: string,
    @Body() params: HttpServiceType,
  ): Promise<HttpService> {
    return this.httpServicesService.createHttpService(+nodeId, params);
  }

  @Get('/:nodeId/http/:serviceId')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  async getService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<HttpService> {
    return this.httpServicesService.getHttpService(+serviceId, ['node']);
  }

  @Patch('/:nodeId/http/:serviceId')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({
        nodeId: Joi.string().required(),
        serviceId: Joi.string().required(),
      }),
      body: httpServiceValidator,
    }),
  )
  async updateService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
    @Body() params,
  ): Promise<HttpService> {
    return this.httpServicesService.updateHttpService(+serviceId, params);
  }

  @Patch('/:nodeId/http/:serviceId/enable')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR])
  @UseBefore(
    celebrate({
      params: Joi.object({
        nodeId: Joi.string().required(),
        serviceId: Joi.string().required(),
      }),
    }),
  )
  async enableService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<HttpService> {
    return this.httpServicesService.enableService(+serviceId);
  }

  @Patch('/:nodeId/http/:serviceId/disable')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR])
  @UseBefore(
    celebrate({
      params: Joi.object({
        nodeId: Joi.string().required(),
        serviceId: Joi.string().required(),
      }),
    }),
  )
  async disableService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<HttpService> {
    return this.httpServicesService.disableService(+serviceId);
  }

  @Delete('/:nodeId/http/:serviceId')
  // @Authorized([ROLE_ADMIN])
  async deleteNodeService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<string> {
    return this.httpServicesService.deleteHttpService(+serviceId);
  }

  @Get('/:nodeId/http/:serviceId/ping')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR])
  async pingHttpService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
    @QueryParam('path') path?: string,
  ): Promise<{ status: number }> {
    return this.httpServicesService.pingHttpServiceBackend(+serviceId, path);
  }

  @Get('/tcp')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  @UseBefore(
    celebrate({
      query: tcpServiceFilterValidator,
    }),
  )
  async getTcpServices(
    @QueryParams() filters: TcpServiceFilterQueryParams,
  ): Promise<TcpService | TcpService[] | PagedData<TcpService>> {
    return this.tcpServicesService.getTcpServices(filters);
  }

  @Get('/:nodeId/tcp')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  @UseBefore(
    celebrate({
      params: Joi.object({ nodeId: Joi.string().required() }),
      query: tcpServiceFilterValidator,
    }),
  )
  async getNodeTcpServices(
    @Param('nodeId') nodeId: string,
    @QueryParams() params: TcpServiceFilterQueryParams,
  ): Promise<TcpService | PagedData<TcpService> | TcpService[]> {
    return this.tcpServicesService.getNodeTcpServices(+nodeId, params);
  }

  @Post('/:nodeId/tcp')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ nodeId: Joi.string().required() }),
      body: tcpServiceValidator,
    }),
  )
  async createNodeTcpService(
    @Param('nodeId') nodeId: string,
    @Body() params: TcpServiceType,
  ): Promise<TcpService> {
    return this.tcpServicesService.createTcpService(+nodeId, params);
  }

  @Get('/:nodeId/tcp/:serviceId')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  async getTcpService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<TcpService> {
    return this.tcpServicesService.getTcpService(+serviceId, ['node']);
  }

  @Patch('/:nodeId/tcp/:serviceId')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({
        nodeId: Joi.string().required(),
        serviceId: Joi.string().required(),
      }),
      body: tcpServiceValidator,
    }),
  )
  async updateTcpService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
    @Body() params: TcpServiceType,
  ): Promise<TcpService> {
    return this.tcpServicesService.updateTcpService(+serviceId, params);
  }

  @Patch('/:nodeId/tcp/:serviceId/enable')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR])
  @UseBefore(
    celebrate({
      params: Joi.object({
        nodeId: Joi.string().required(),
        serviceId: Joi.string().required(),
      }),
    }),
  )
  async enableTcpService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<TcpService> {
    return this.tcpServicesService.enableService(+serviceId);
  }

  @Patch('/:nodeId/tcp/:serviceId/disable')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR])
  @UseBefore(
    celebrate({
      params: Joi.object({
        nodeId: Joi.string().required(),
        serviceId: Joi.string().required(),
      }),
    }),
  )
  async disableTcpService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<TcpService> {
    return this.tcpServicesService.disableService(+serviceId);
  }

  @Delete('/:nodeId/tcp/:serviceId')
  // @Authorized([ROLE_ADMIN])
  async deleteNodeTcpService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<string> {
    return this.tcpServicesService.deleteTcpService(+serviceId);
  }
}
