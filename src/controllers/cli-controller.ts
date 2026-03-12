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
  Res,
  UseBefore,
} from 'routing-controllers';
import YAML from 'yaml';
import { Request, Response } from 'express';
import { NodesService } from '../services/nodes-service';
import { HttpServicesService } from '../services/http-services-service';
import { TcpServicesService } from '../services/tcp-services-service';
import {
  HttpServiceFilterQueryParams,
  httpServiceFilterValidator,
  HttpServiceType,
  httpServiceValidator,
  ttlValidator,
} from '../schemas/http-service-schemas';
import {
  TcpServiceFilterQueryParams,
  TcpServiceType,
  tcpServiceValidator,
} from '../schemas/tcp-service-schemas';
import { AuthenticatedUser } from '../middlewares/auth-token-handler';
import BaseController from './base-controller';
import { Node } from '../database/models/node';
import { NodeInfo, NodeWithToken } from '../schemas/node-schemas';
import { WGConfigObject } from '../services/wireguard/wireguard-service';
import { HttpService } from '../database/models/http-service';
import { TcpService } from '../database/models/tcp-service';
import { CliTokenHandler } from '../middlewares/cli-token-handler';
import Joi from '../utils/joi-validator';
import { gatewayNetworkValidator } from '../schemas/node-schemas';
import { PagedData } from '../schemas/shared-schemas';
import { NodeIacService } from '../services/node-iac-service';
import { parseBody } from './iac-stack-controller';

@Service()
@JsonController('/cli')
@UseBefore(CliTokenHandler)
export default class CLiController extends BaseController {
  constructor(
    @Inject() private readonly nodesService: NodesService,
    @Inject() private readonly httpServicesService: HttpServicesService,
    @Inject() private readonly tcpServicesService: TcpServicesService,
    @Inject() private readonly nodeIacService: NodeIacService,
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

  @Get('/iac/export')
  async exportNodeManifest(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<Response> {
    req.logger.audit(`Exporting node manifest for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
    });

    const node = await this.nodesService.getNode(+cli.nodeId);
    const nodeContext = {
      id: cli.nodeId,
      externalId: node.externalId,
      name: node.name,
    };

    const manifest = await this.nodeIacService.export(nodeContext);

    const format = req.query.format ?? 'yaml';

    if (format === 'json') {
      res.json(manifest);
      return;
    }

    const yaml = YAML.stringify(manifest, {
      indent: 2,
      lineWidth: 120,
      nullStr: '',
    });

    res
      .set('Content-Type', 'application/x-yaml')
      .set('Content-Disposition', 'attachment; filename="wiredoor.yml"')
      .send(yaml);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${node.name}-manifest.yaml"`,
    );

    return res.send(manifest);
  }

  @Post('/iac/validate')
  async validateNodeManifest(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<Response> {
    const manifest = this.nodeIacService.parseAndValidate(parseBody(req));

    req.logger.audit(`Validating node manifest for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      patId: cli.id,
      manifest,
    });

    const node = await this.nodesService.getNode(+cli.nodeId);
    const nodeContext = {
      id: cli.nodeId,
      externalId: node.externalId,
      name: node.name,
    };

    const ownershipErrors = await this.nodeIacService.verifyOwnership(
      manifest,
      nodeContext,
    );

    if (ownershipErrors.length > 0) {
      return res.status(403).json({
        valid: false,
        errors: ownershipErrors.map((message) => ({
          phase: 'ownership',
          severity: 'error',
          path: '',
          code: 'OWNERSHIP_VIOLATION',
          message,
        })),
        warnings: [],
      });
    }

    const validationResult = await this.nodeIacService.validate(
      manifest,
      nodeContext,
    );

    return res
      .status(validationResult.valid ? 200 : 422)
      .json(validationResult);
  }

  @Post('/iac/plan')
  async planNodeManifest(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<Response> {
    const manifest = this.nodeIacService.parseAndValidate(parseBody(req));

    req.logger.audit(`Planning node manifest for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      manifest,
    });

    const node = await this.nodesService.getNode(+cli.nodeId);
    const nodeContext = {
      id: cli.nodeId,
      externalId: node.externalId,
      name: node.name,
    };

    const ownershipErrors = await this.nodeIacService.verifyOwnership(
      manifest,
      nodeContext,
    );

    if (ownershipErrors.length > 0) {
      return res.status(403).json({
        valid: false,
        error: 'Ownership violation',
        details: ownershipErrors,
      });
    }

    const result = await this.nodeIacService.reconcile(
      manifest,
      nodeContext,
      'plan',
    );

    result.phases = result.phases.filter((p) => p.phaseId !== 'node');

    return res.json(result);
  }

  @Post('/iac/apply')
  async applyNodeManifest(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser({ required: true }) cli: AuthenticatedUser,
  ): Promise<Response> {
    const manifest = this.nodeIacService.parseAndValidate(parseBody(req));

    await this.nodeIacService.ensureExternalIds();

    req.logger.audit(`Applying node manifest for node ${cli.nodeName}`, {
      nodeName: cli.nodeName,
      patName: cli.tokenName,
      nodeId: cli.nodeId,
      manifest,
    });

    const node = await this.nodesService.getNode(+cli.nodeId);
    const nodeContext = {
      id: cli.nodeId,
      externalId: node.externalId,
      name: node.name,
    };

    const ownershipErrors = await this.nodeIacService.verifyOwnership(
      manifest,
      nodeContext,
    );

    if (ownershipErrors.length > 0) {
      return res.status(403).json({
        valid: false,
        error: 'Ownership violation',
        details: ownershipErrors,
      });
    }

    const result = await this.nodeIacService.reconcile(
      manifest,
      nodeContext,
      'apply',
    );

    result.phases = result.phases.filter((p) => p.phaseId !== 'node');

    return res.json(result);
  }
}
