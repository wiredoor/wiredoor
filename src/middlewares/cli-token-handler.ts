import {
  ExpressMiddlewareInterface,
  ForbiddenError,
  UnauthorizedError,
} from 'routing-controllers';
import { PatService } from '../services/pat-service';
import { Inject, Service } from 'typedi';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedUser, getDataFromToken } from './auth-token-handler';
import { NodeApiKeyService } from '../services/node-api-key-service';

function getBearerToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ?? null;
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 || parts.length === 2;
}

function parseWiredoorCliUserAgent(req: Request): string | null {
  const userAgent = req.headers['user-agent'] || '';
  const prefix = 'wiredoor-cli/';
  if (!userAgent.toLowerCase().startsWith(prefix)) {
    return null;
  }

  const ver = userAgent.slice(prefix.length).trim();

  if (!ver) {
    return null;
  }

  return ver;
}

@Service()
export class CliTokenHandler implements ExpressMiddlewareInterface {
  constructor(
    @Inject() private readonly patService: PatService,
    @Inject() private readonly nodeApiKeyService: NodeApiKeyService,
  ) {}

  async use(
    request: Request,
    response: Response,
    next: (err?: unknown) => NextFunction,
  ): Promise<void> {
    const token =
      getBearerToken(request) || (request.query?.token as string | undefined);
    if (!token) throw new UnauthorizedError('Unauthorized: Invalid token');

    if (looksLikeJwt(token)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      request.user = await this.getUserFromToken(token);
      next();
    }

    const cliVersion = parseWiredoorCliUserAgent(request);

    const verified = await this.nodeApiKeyService.verify(token, cliVersion);
    if (!verified) throw new UnauthorizedError('Unauthorized: Invalid token');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    request.user = verified;
    next();
  }

  async getUserFromToken(token: string): Promise<AuthenticatedUser> {
    const data = await getDataFromToken(token);

    if (!data) {
      throw new UnauthorizedError('Unauthorized: Invalid token');
    }

    if (data.type === 'client') {
      const pat = await this.patService.getPatById(data.id);

      if (!pat || pat.revoked || pat.expireAt > new Date()) {
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
