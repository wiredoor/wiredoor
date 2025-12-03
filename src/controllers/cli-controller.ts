import { Inject, Service } from 'typedi';
import { celebrate } from 'celebrate';
import {
  BadRequestError,
  Body,
  CurrentUser,
  Get,
  JsonController,
  Param,
  Patch,
  Post,
  QueryParams,
  Req,
  UseBefore,
} from 'routing-controllers';
import { Request } from 'express';
import { NodesService } from '../services/nodes-service';
import { HttpServicesService } from '../services/http-services-service';
import { TcpServicesService } from '../services/tcp-services-service';
import {
  HttpServiceFilterQueryParams,
  httpServiceFilterValidator,
  HttpServiceType,
  httpServiceValidator,
  ttlValidator,
} from '../validators/http-service-validator';
import {
  TcpServiceFilterQueryParams,
  TcpServiceType,
  tcpServiceValidator,
} from '../validators/tcp-service-validator';
import { AuthenticatedUser } from '../middlewares/auth-token-handler';
import BaseController from './base-controller';
import { Node, NodeInfo, NodeWithToken } from '../database/models/node';
import { WGConfigObject } from '../services/wireguard/wireguard-service';
import { HttpService } from '../database/models/http-service';
import { PagedData } from '../repositories/filters/repository-query-filter';
import { TcpService } from '../database/models/tcp-service';
import { CliTokenHandler } from '../middlewares/cli-token-handler';
import Joi from '../validators/joi-validator';
import { gatewayNetworkValidator } from '../validators/node-validators';

@Service()
@JsonController('/cli')
@UseBefore(CliTokenHandler)
export default class CLiController extends BaseController {
  constructor(
    @Inject() private readonly nodesService: NodesService,
    @Inject() private readonly httpServicesService: HttpServicesService,
    @Inject() private readonly tcpServicesService: TcpServicesService,
  ) {
    super();
  }

  @Get('/node')
  async getCliNode(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<NodeInfo> {
    req.logger.audit(`Node info requested for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
    });
    return this.nodesService.getNodeInfo(+cli.nodeId, [
      'httpServices',
      'tcpServices',
    ]);
  }

  @Get('/config')
  async getCliConfig(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<string> {
    req.logger.audit(`Node config requested for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
    });
    return this.nodesService.getNodeConfig(+cli.nodeId);
  }

  @Get('/wgconfig')
  async getCliWGConfig(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<WGConfigObject> {
    req.logger.audit(`WireGuard config requested for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
    });
    return this.nodesService.getNodeWGConfig(+cli.nodeId);
  }

  @Patch('/node/gateway')
  @UseBefore(
    celebrate({
      body: Joi.object({
        gatewayInterface: Joi.string().optional(),
        gatewayNetwork: gatewayNetworkValidator,
      }),
    }),
  )
  async updateGatewayNetwork(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Body() params: { gatewayNetwork: string; gatewayInterface?: string },
  ): Promise<Node> {
    const node = await this.nodesService.getNode(+cli.nodeId, [
      'httpServices',
      'tcpServices',
    ]);

    req.logger.audit(
      `Trying to update gateway network for node ${cli.nodeName}`,
      {
        params,
        nodeName: cli.nodeName,
        patName: cli.tokenName,
        nodeId: cli.nodeId,
        patId: cli.id,
      },
    );

    if (node.isGateway) {
      const gatewayNetworks = node.gatewayNetworks;
      gatewayNetworks[0].interface = params.gatewayInterface || 'eth0';
      gatewayNetworks[0].subnet = params.gatewayNetwork;

      const updated = await this.nodesService.updateNode(+cli.nodeId, {
        gatewayNetworks,
      });

      req.logger.audit(
        `Gateway network updated to ${params.gatewayNetwork} for node ${cli.nodeName}`,
        {
          nodeName: cli.nodeName,
          patName: cli.tokenName,
          nodeId: cli.nodeId,
          patId: cli.id,
        },
      );

      return updated;
    } else {
      req.logger.audit(
        `Attempted to update gateway network for non-gateway node ${cli.nodeName} failed`,
        {
          nodeName: cli.nodeName,
          patName: cli.tokenName,
          nodeId: cli.nodeId,
          patId: cli.id,
        },
      );
      throw new BadRequestError(
        `This node isn't a gateway. Update node from wiredoor dashboard using administrative account`,
      );
    }
  }

  @Get('/services/http')
  @UseBefore(
    celebrate({
      query: httpServiceFilterValidator,
    }),
  )
  async getCliServices(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @QueryParams() params: HttpServiceFilterQueryParams,
  ): Promise<HttpService | HttpService[] | PagedData<HttpService>> {
    req.logger.audit(`HTTP services info requested for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
    });
    return this.httpServicesService.getNodeHttpServices(+cli.nodeId, params);
  }

  @Patch('/services/http/:id/disable')
  @UseBefore(
    celebrate({
      params: Joi.object({
        id: Joi.number().required(),
      }),
    }),
  )
  async disableHttpService(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
  ): Promise<HttpService> {
    const svc = await this.httpServicesService.disableNodeService(
      id,
      cli.nodeId,
    );
    req.logger.audit(`Disabling HTTP service ${id} for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
      serviceId: id,
      serviceName: svc.name,
    });
    return svc;
  }

  @Patch('/services/http/:id/enable')
  @UseBefore(
    celebrate({
      params: Joi.object({
        id: Joi.number().required(),
      }),
      body: Joi.object({
        ttl: ttlValidator,
      }),
    }),
  )
  async enableHttpService(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
    @Body() params: { ttl: string | undefined },
  ): Promise<HttpService> {
    const svc = await this.httpServicesService.enableNodeService(
      id,
      cli.nodeId,
      params.ttl,
    );
    req.logger.audit(`Enabling HTTP service ${id} for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
      serviceId: id,
      serviceName: svc.name,
      ttl: params.ttl,
    });
    return svc;
  }

  @Get('/services/tcp')
  @UseBefore(
    celebrate({
      query: httpServiceFilterValidator,
    }),
  )
  async getCliTcpServices(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @QueryParams() params: TcpServiceFilterQueryParams,
  ): Promise<TcpService | TcpService[] | PagedData<TcpService>> {
    req.logger.audit(`TCP services info requested for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
    });
    return this.tcpServicesService.getNodeTcpServices(+cli.nodeId, params);
  }

  @Patch('/services/tcp/:id/disable')
  @UseBefore(
    celebrate({
      params: Joi.object({
        id: Joi.number().required(),
      }),
    }),
  )
  async disableTcpService(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
  ): Promise<TcpService> {
    const svc = await this.tcpServicesService.disableNodeService(
      id,
      cli.nodeId,
    );
    req.logger.audit(`Disabling TCP service ${id} for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
      serviceId: id,
      serviceName: svc.name,
    });
    return svc;
  }

  @Patch('/services/tcp/:id/enable')
  @UseBefore(
    celebrate({
      params: Joi.object({
        id: Joi.number().required(),
      }),
      body: Joi.object({
        ttl: ttlValidator,
      }),
    }),
  )
  async enableTcpService(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
    @Body() params: { ttl: string | undefined },
  ): Promise<TcpService> {
    const svc = await this.tcpServicesService.enableNodeService(
      id,
      cli.nodeId,
      params.ttl,
    );
    req.logger.audit(`Enabling TCP service ${id} for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
      serviceId: id,
      serviceName: svc.name,
      ttl: params.ttl,
    });
    return svc;
  }

  @Post('/expose/http')
  @UseBefore(
    celebrate({
      body: httpServiceValidator,
    }),
  )
  async createNodeService(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Body() params: HttpServiceType,
  ): Promise<HttpService> {
    req.logger.audit(`Exposing HTTP service for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
      serviceParams: params,
    });
    return this.httpServicesService.createHttpService(+cli.nodeId, params);
  }

  @Post('/expose/tcp')
  @UseBefore(
    celebrate({
      body: tcpServiceValidator,
    }),
  )
  async createNodeTcpService(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Body() params: TcpServiceType,
  ): Promise<TcpService> {
    req.logger.audit(`Exposing TCP service for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
      serviceParams: params,
    });
    return this.tcpServicesService.createTcpService(+cli.nodeId, params);
  }

  @Patch('/regenerate')
  async regenerateNodeKeys(
    @Req() req: Request,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<NodeWithToken> {
    req.logger.audit(`Regenerating keys for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
    });
    return this.nodesService.regenerateNodeKeys(cli.nodeId);
  }
}
