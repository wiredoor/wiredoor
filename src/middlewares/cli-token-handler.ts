import {
  ExpressMiddlewareInterface,
  ForbiddenError,
  UnauthorizedError,
} from 'routing-controllers';
import { NodesService } from '../services/nodes-service';
import { PatService } from '../services/pat-service';
import { Inject, Service } from 'typedi';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedUser, getDataFromToken } from './auth-token-handler';

@Service()
export class CliTokenHandler implements ExpressMiddlewareInterface {
  constructor(
    @Inject() private readonly nodesService: NodesService,
    @Inject() private readonly patService: PatService,
  ) {}

  async use(
    request: Request,
    response: Response,
    next: (err?: unknown) => NextFunction,
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    const token =
      (authHeader && authHeader.split(' ')[1]) || request.query?.token;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    request.user = await this.getUserFromToken(token);
    next();
  }

  async getUserFromToken(token: string): Promise<AuthenticatedUser> {
    const data = await getDataFromToken(token);

    if (!data) {
      throw new UnauthorizedError();
    }

    if (data.type === 'client') {
      const pat = await this.patService.getPatById(data.id);

      if (!pat || pat.revoked || (pat.expireAt && pat.expireAt < new Date())) {
        throw new ForbiddenError();
      }

      return {
        ...data,
        nodeId: pat.nodeId,
        tokenName: pat.name,
      };
    } else {
      throw new ForbiddenError();
    }
  }
}
