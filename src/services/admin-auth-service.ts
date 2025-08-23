import { UnauthorizedError } from 'routing-controllers';
import { Service } from 'typedi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';

export type Session = {
  user: {
    id: string;
    username: string;
    email?: string;
    roles: string[];
  };
  accessToken?: string;
};

export interface AuthenticationProvider {
  getSession(req: any): Promise<Session | null>;
}

export interface AuthenticatedUser {
  iss?: string;
  aud?: string;
  sub: string;
  preferred_username: string;
  email: string;
  email_verified?: boolean;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [client: string]: {
      roles: string[];
    };
  };
  source?: string;
}

export interface JWTResponse {
  token: string;
  expiresIn: string;
}

@Service()
export class AdminAuthService {
  constructor() {}

  async auth(username: string, password: string): Promise<JWTResponse> {
    const isPasswordValid = await bcrypt.compare(
      password,
      config.admin.password,
    );

    if (username !== config.admin.email || !isPasswordValid) {
      throw new UnauthorizedError();
    }

    const expiresIn = '1h';

    const token = jwt.sign(
      { id: 0, type: 'admin', name: username },
      config.jwt.secret,
      {
        expiresIn,
        algorithm: config.jwt.algo,
      },
    );

    return { token, expiresIn };
  }
}
