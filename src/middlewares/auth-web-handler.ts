import {
  ExpressMiddlewareInterface,
  UnauthorizedError,
} from 'routing-controllers';
import { Service } from 'typedi';
import { NextFunction, Request, Response } from 'express';
import { UsersService } from '../services/users-service';
import { SessionService } from '../services/sessions-service';
import config from '../config';

@Service()
export class AuthWebHandler implements ExpressMiddlewareInterface {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  async use(
    request: Request,
    response: Response,
    next: (err?: unknown) => NextFunction,
  ): Promise<void> {
    const sid = request.cookies?.[config.session.name];

    if (!sid) {
      throw new UnauthorizedError();
    }

    const resolved = await this.sessionService.getValidSessionBySid(sid);

    if (!resolved) {
      throw new UnauthorizedError();
    }

    request.user = resolved.user;
    request.session = resolved.session;
    next();
  }
}
