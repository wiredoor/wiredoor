import { Inject, Service } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import { Request, Response } from 'express';
import {
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
import {
  CreatePATType,
  createPATValidator,
  PatFilterQueryParams,
  patFilterValidator,
} from '../validators/pat-validator';
import { NodesService } from '../services/nodes-service';
import { PatService } from '../services/pat-service';
import { ResponseSSE, SetupSSE } from '../middlewares/setup-sse';
import BaseController from './base-controller';
import { Node, NodeInfo, NodeWithToken } from '../database/models/node';
import { PagedData } from '../repositories/filters/repository-query-filter';
import {
  PersonalAccessToken,
  PersonalAccessTokenWithToken,
} from '../database/models/personal-access-token';
import {
  AdminTokenHandler,
  AuthenticatedUser,
} from '../middlewares/admin-token-handler';

@Service()
@JsonController('/nodes')
@UseBefore(AdminTokenHandler)
export default class NodeController extends BaseController {
  constructor(
    @Inject() private readonly nodesService: NodesService,
    @Inject() private readonly patService: PatService,
  ) {
    super();
  }

  @Get('/')
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
    const node = await this.nodesService.createNodeWithPAT(params);
    req.logger.audit(`New node ${params.name} created`, {
      nodeId: node.id,
      nodeName: params.name,
      isGateway: params.isGateway,
      user: user.name,
    });
    return node;
  }

  @Get('/:id')
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async getNode(@Param('id') id: string): Promise<NodeInfo> {
    return this.nodesService.getNodeInfo(+id);
  }

  @Get('/:id/config')
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

  @Get('/:id/pats')
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
      query: patFilterValidator,
    }),
  )
  async getPats(
    @Param('id') id: string,
    @QueryParams() params: PatFilterQueryParams,
  ): Promise<
    PersonalAccessToken | PersonalAccessToken[] | PagedData<PersonalAccessToken>
  > {
    return this.patService.getPATs(+id, params);
  }

  @Post('/:id/pats')
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
      body: createPATValidator,
    }),
  )
  async createTokenForNode(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Body() params: CreatePATType,
  ): Promise<PersonalAccessTokenWithToken> {
    // ensure that node exists
    const node = await this.nodesService.getNode(+id);

    const pat = await this.patService.createNodePAT(node.id, params);

    req.logger.audit(`Created PAT ${pat.name} for node ${node.name}`, {
      nodeId: id,
      nodeName: node.name,
      user: user.name,
      patId: pat.id,
    });

    return pat;
  }

  @Delete('/:id/pats/:patId')
  @UseBefore(
    celebrate({
      params: Joi.object({
        id: Joi.string().required(),
        patId: Joi.string().required(),
      }),
    }),
  )
  async deletePat(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Param('patId') patId: string,
  ): Promise<string> {
    req.logger.audit(`Deleting PAT with id ${patId} for node with id ${id}`, {
      nodeId: id,
      patId: patId,
      user: user.name,
    });
    return this.patService.deletePat(+patId);
  }

  @Patch('/:id/pats/:patId/revoke')
  @UseBefore(
    celebrate({
      params: Joi.object({
        id: Joi.string().required(),
        patId: Joi.string().required(),
      }),
    }),
  )
  async revokePat(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser({ required: true }) user: AuthenticatedUser,
    @Param('patId') patId: string,
  ): Promise<PersonalAccessToken> {
    const pat = await this.patService.revokeToken(+patId);
    req.logger.audit(`Revoking PAT ${pat.name} for node with id ${id}`, {
      nodeId: id,
      patId: patId,
      user: user.name,
    });
    return pat;
  }
}
