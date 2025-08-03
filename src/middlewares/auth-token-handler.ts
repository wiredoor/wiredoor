import {
  ExpressMiddlewareInterface,
  UnauthorizedError,
} from 'routing-controllers';
import { Service } from 'typedi';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { PersonalAccessToken } from '../database/models/personal-access-token';

export interface AuthenticatedUser extends PersonalAccessToken {
  nodeName?: string;
  address?: string;
}

export const getDataFromToken = async (token: string): Promise<any> => {
  if (!token || token === 'None') {
    throw new UnauthorizedError();
  }

  let data = undefined;

  try {
    const jwtDef = btoa(JSON.stringify({ alg: config.jwt.algo, typ: 'JWT' }));

    if (!token.startsWith(jwtDef)) {
      token = `${jwtDef}.${token}`;
    }

    data = jwt.verify(token, config.jwt.secret, {
      algorithm: config.jwt.algo,
    });

    return data;
  } catch {
    throw new UnauthorizedError();
  }
};

@Service()
export class AuthTokenHandler implements ExpressMiddlewareInterface {
  constructor() {}

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

    return data;
  }
}
