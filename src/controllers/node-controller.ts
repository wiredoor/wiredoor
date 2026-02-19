import { Inject, Service } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import { Request, Response } from 'express';
import {
  // Authorized,
  Body,
  CurrentUser,
  Delete,
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
import {
  createNodeValidator,
  CreateNodeType,
  nodeFilterValidator,
  NodeFilterQueryParams,
  NodeFilterStreamParams,
} from '../validators/node-validators';
import { NodesService } from '../services/nodes-service';
import { PatService } from '../services/pat-service';
import { ResponseSSE, SetupSSE } from '../middlewares/setup-sse';
import BaseController from './base-controller';
import { Node, NodeInfo, NodeWithToken } from '../database/models/node';
import { PagedData } from '../repositories/filters/repository-query-filter';
import { AuthenticatedUser } from '../middlewares/admin-token-handler';
import { AuthWebHandler } from '../middlewares/auth-web-handler';

@Service()
@JsonController('/nodes')
@UseBefore(AuthWebHandler)
export default class NodeController extends BaseController {
  constructor(
    @Inject() private readonly nodesService: NodesService,
    @Inject() private readonly patService: PatService,
  ) {
    super();
  }

  @Get('/')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  @UseBefore(
    celebrate({
      query: nodeFilterValidator,
    }),
  )
  async getNodes(
    @QueryParams() filters: NodeFilterQueryParams,
  ): Promise<PagedData<NodeInfo>> {
    const nodesFiltered = (await this.nodesService.getNodes(
      filters,
    )) as unknown as PagedData<Node>;

    const nodes = await this.nodesService.getNodesRuntime(nodesFiltered.data);

    return {
      ...nodesFiltered,
      data: nodes,
    };
  }

  @Get('/stream')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  @UseBefore(SetupSSE)
  async getNodesAsStream(
    @QueryParams() filters: NodeFilterStreamParams,
    @Req() req: Request,
    @Res() res: ResponseSSE,
  ): Promise<ResponseSSE> {
    if (filters.token) {
      delete filters.token;
    }

    if (filters.id) {
      const node = await this.nodesService.getNode(+filters.id);

      return this.responseDataAtInterval(
        req,
        res,
        async () => {
          return this.nodesService.getNodeRuntime(node);
        },
        1000,
      );
    } else {
      const nodes = (await this.nodesService.getNodes(
        filters,
      )) as PagedData<Node>;

      return this.responseDataAtInterval(
        req,
        res,
        async () => {
          return this.nodesService.getNodesRuntime(nodes.data);
        },
        1000,
      );
    }
  }

  @Post('/')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      body: createNodeValidator,
    }),
  )
  async createNode(
    @Body() params: CreateNodeType,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<NodeWithToken> {
    const node = await this.nodesService.createNodeWithTokenKey(params);
    req.logger.audit(`New node ${params.name} created`, {
      nodeId: node.id,
      nodeName: params.name,
      isGateway: params.isGateway,
      user: user.name,
    });
    return node;
  }

  @Get('/:id')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async getNode(@Param('id') id: string): Promise<NodeInfo> {
    return this.nodesService.getNodeInfo(+id);
  }

  @Get('/:id/config')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async getNodeClientConfig(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<string> {
    req.logger.audit(`Getting client config for node with id ${id}`, {
      nodeId: id,
      user: user.name,
    });
    return this.nodesService.getNodeConfig(+id);
  }

  @Get('/:id/download')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async downloadNodeClientConfig(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<Response> {
    req.logger.audit(`Downloading client config for node with id ${id}`, {
      nodeId: id,
      user: user.name,
    });
    return this.nodesService.downloadNodeConfig(+id, res);
  }

  @Patch('/:id')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
      body: createNodeValidator,
    }),
  )
  async updateNode(@Param('id') id: string, @Body() params): Promise<Node> {
    return this.nodesService.updateNode(+id, params);
  }

  @Patch('/:id/disable')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async disableNode(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<Node> {
    const node = await this.nodesService.disableNode(+id);

    req.logger.audit(`Node ${node.name} disabled`, {
      nodeId: id,
      nodeName: node.name,
      user: user.name,
    });

    return node;
  }

  @Patch('/:id/enable')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async enableNode(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<Node> {
    const node = await this.nodesService.enableNode(+id);

    req.logger.audit(`Node ${node.name} enabled`, {
      nodeId: id,
      nodeName: node.name,
      user: user.name,
    });

    return node;
  }

  @Delete('/:id')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async deleteNode(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<string> {
    req.logger.audit(`Deleting node with id ${id}`, {
      nodeId: id,
      user: user.name,
    });
    return this.nodesService.deleteNode(+id);
  }

  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  @Post('/:id/regenerate-token')
  // @Authorized([ROLE_ADMIN])
  async regenerateNodeToken(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<{ token: string }> {
    const nodeWithKey = await this.nodesService.regenerateApiKey(+id);

    req.logger.audit(`Regenerated token for node ${nodeWithKey.name}`, {
      nodeId: id,
      nodeName: nodeWithKey.name,
      user: user.name,
    });

    return { token: nodeWithKey.token };
  }

  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  @Post('/:id/regenerate-keys')
  // @Authorized([ROLE_ADMIN])
  async regenerateKeys(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<{ token: string }> {
    const nodeWithKey = await this.nodesService.regenerateNodeKeys(+id);

    req.logger.audit(`Regenerated token for node ${nodeWithKey.name}`, {
      nodeId: id,
      nodeName: nodeWithKey.name,
      user: user.name,
    });

    return { token: nodeWithKey.token };
  }
}
