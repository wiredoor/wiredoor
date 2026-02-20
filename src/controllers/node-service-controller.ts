import {
  Body,
  CurrentUser,
  Delete,
  Get,
  JsonController,
  Param,
  Patch,
  Post,
  QueryParam,
  QueryParams,
  Req,
  UseBefore,
} from 'routing-controllers';
import { Request } from 'express';
import { Inject, Service } from 'typedi';
import Joi from 'joi';
import { celebrate } from 'celebrate';
import BaseController from './base-controller';
import {
  HttpServiceFilterQueryParams,
  httpServiceFilterValidator,
  HttpServiceType,
  httpServiceValidator,
} from '../schemas/http-service-schemas';
import {
  TcpServiceFilterQueryParams,
  tcpServiceFilterValidator,
  TcpServiceType,
  tcpServiceValidator,
} from '../schemas/tcp-service-schemas';
import { HttpServicesService } from '../services/http-services-service';
import { TcpServicesService } from '../services/tcp-services-service';
import { HttpService } from '../database/models/http-service';
import { TcpService } from '../database/models/tcp-service';
import { AuthenticatedUser } from '../middlewares/admin-token-handler';
import { AuthWebHandler } from '../middlewares/auth-web-handler';
import { PagedData } from '../schemas/shared-schemas';

@Service()
@JsonController('/services')
@UseBefore(AuthWebHandler)
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Body() params: HttpServiceType,
  ): Promise<HttpService> {
    const svc = await this.httpServicesService.createHttpService(
      +nodeId,
      params,
    );
    req.logger.audit(
      `Created HTTP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Body() params,
  ): Promise<HttpService> {
    const svc = await this.httpServicesService.updateHttpService(
      +serviceId,
      params,
    );
    req.logger.audit(
      `Updated HTTP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Param('serviceId') serviceId: string,
  ): Promise<HttpService> {
    const svc = await this.httpServicesService.enableService(+serviceId);
    req.logger.audit(
      `Enabled HTTP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Param('serviceId') serviceId: string,
  ): Promise<HttpService> {
    const svc = await this.httpServicesService.disableService(+serviceId);
    req.logger.audit(
      `Disabled HTTP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
  }

  @Delete('/:nodeId/http/:serviceId')
  // @Authorized([ROLE_ADMIN])
  async deleteNodeService(
    @Param('nodeId') nodeId: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Param('serviceId') serviceId: string,
  ): Promise<string> {
    req.logger.audit(
      `Deleting HTTP service with id ${serviceId} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: serviceId,
        user: user.name,
      },
    );
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Body() params: TcpServiceType,
  ): Promise<TcpService> {
    const svc = await this.tcpServicesService.createTcpService(+nodeId, params);
    req.logger.audit(
      `Created TCP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Body() params: TcpServiceType,
  ): Promise<TcpService> {
    const svc = await this.tcpServicesService.updateTcpService(
      +serviceId,
      params,
    );
    req.logger.audit(
      `Updated TCP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<TcpService> {
    const svc = await this.tcpServicesService.enableService(+serviceId);
    req.logger.audit(
      `Enabled TCP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
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
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<TcpService> {
    const svc = await this.tcpServicesService.disableService(+serviceId);
    req.logger.audit(
      `Disabled TCP service ${svc.name} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: svc.id,
        serviceName: svc.name,
        user: user.name,
      },
    );
    return svc;
  }
  @Delete('/:nodeId/tcp/:serviceId')
  // @Authorized([ROLE_ADMIN])
  async deleteNodeTcpService(
    @Param('nodeId') nodeId: string,
    @Param('serviceId') serviceId: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<string> {
    req.logger.audit(
      `Deleting TCP service with id ${serviceId} for node with id ${nodeId}`,
      {
        nodeId: nodeId,
        serviceId: serviceId,
        user: user.name,
      },
    );
    return this.tcpServicesService.deleteTcpService(+serviceId);
  }
}
