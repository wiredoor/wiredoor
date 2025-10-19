import { Inject, Service } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import { Request, Response } from 'express';
import {
  // Authorized,
  Body,
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
import { AdminTokenHandler } from '../middlewares/admin-token-handler';
// import { ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER } from '../utils/constants';

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
  async createNode(@Body() params: CreateNodeType): Promise<NodeWithToken> {
    return this.nodesService.createNodeWithPAT(params);
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
  async getNodeClientConfig(@Param('id') id: string): Promise<string> {
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
    @Res() res: Response,
  ): Promise<Response> {
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
  async disableNode(@Param('id') id: string): Promise<Node> {
    return this.nodesService.disableNode(+id);
  }

  @Patch('/:id/enable')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async enableNode(@Param('id') id: string): Promise<Node> {
    return this.nodesService.enableNode(+id);
  }

  @Delete('/:id')
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
    }),
  )
  async deleteNode(@Param('id') id: string): Promise<string> {
    return this.nodesService.deleteNode(+id);
  }

  @Get('/:id/pats')
  // @Authorized([ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER])
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
  // @Authorized([ROLE_ADMIN])
  @UseBefore(
    celebrate({
      params: Joi.object({ id: Joi.string().required() }),
      body: createPATValidator,
    }),
  )
  async createTokenForNode(
    @Param('id') id: string,
    @Body() params: CreatePATType,
  ): Promise<PersonalAccessTokenWithToken> {
    // ensure that node exists
    const node = await this.nodesService.getNode(+id);
    return this.patService.createNodePAT(node.id, params);
  }

  @Delete('/:id/pats/:patId')
  // @Authorized([ROLE_ADMIN])
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
    @Param('patId') patId: string,
  ): Promise<string> {
    return this.patService.deletePat(+patId);
  }

  @Patch('/:id/pats/:patId/revoke')
  // @Authorized([ROLE_ADMIN])
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
    @Param('patId') patId: string,
  ): Promise<PersonalAccessToken> {
    return this.patService.revokeToken(+patId);
  }
}
