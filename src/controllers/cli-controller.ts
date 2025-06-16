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
  UseBefore,
} from 'routing-controllers';
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
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<NodeInfo> {
    return this.nodesService.getNodeInfo(+cli.nodeId, [
      'httpServices',
      'tcpServices',
    ]);
  }

  @Get('/config')
  async getCliConfig(
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<string> {
    return this.nodesService.getNodeConfig(+cli.nodeId);
  }

  @Get('/wgconfig')
  async getCliWGConfig(
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<WGConfigObject> {
    return this.nodesService.getNodeWGConfig(+cli.nodeId);
  }

  @Patch('/node/gateway')
  @UseBefore(
    celebrate({
      body: Joi.object({
        gatewayNetwork: gatewayNetworkValidator,
      }),
    }),
  )
  async updateGatewayNetwork(
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Body() params: { gatewayNetwork: string },
  ): Promise<Node> {
    const node = await this.nodesService.getNode(+cli.nodeId, [
      'httpServices',
      'tcpServices',
    ]);

    if (node.isGateway) {
      return this.nodesService.updateNode(+cli.nodeId, {
        gatewayNetwork: params.gatewayNetwork,
      });
    } else {
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
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @QueryParams() params: HttpServiceFilterQueryParams,
  ): Promise<HttpService | HttpService[] | PagedData<HttpService>> {
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
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
  ): Promise<HttpService> {
    return this.httpServicesService.disableNodeService(id, cli.nodeId);
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
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
    @Body() params: { ttl: string | undefined },
  ): Promise<HttpService> {
    return this.httpServicesService.enableNodeService(
      id,
      cli.nodeId,
      params.ttl,
    );
  }

  @Get('/services/tcp')
  @UseBefore(
    celebrate({
      query: httpServiceFilterValidator,
    }),
  )
  async getCliTcpServices(
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @QueryParams() params: TcpServiceFilterQueryParams,
  ): Promise<TcpService | TcpService[] | PagedData<TcpService>> {
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
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
  ): Promise<TcpService> {
    return this.tcpServicesService.disableNodeService(id, cli.nodeId);
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
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Param('id') id: number,
    @Body() params: { ttl: string | undefined },
  ): Promise<TcpService> {
    return this.tcpServicesService.enableNodeService(
      id,
      cli.nodeId,
      params.ttl,
    );
  }

  @Post('/expose/http')
  @UseBefore(
    celebrate({
      body: httpServiceValidator,
    }),
  )
  async createNodeService(
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Body() params: HttpServiceType,
  ): Promise<HttpService> {
    return this.httpServicesService.createHttpService(+cli.nodeId, params);
  }

  @Post('/expose/tcp')
  @UseBefore(
    celebrate({
      body: tcpServiceValidator,
    }),
  )
  async createNodeTcpService(
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
    @Body() params: TcpServiceType,
  ): Promise<TcpService> {
    return this.tcpServicesService.createTcpService(+cli.nodeId, params);
  }

  @Patch('/regenerate')
  async regenerateNodeKeys(
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<NodeWithToken> {
    return this.nodesService.regenerateNodeKeys(cli.nodeId);
  }
}
