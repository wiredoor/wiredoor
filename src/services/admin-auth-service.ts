import { UnauthorizedError } from 'routing-controllers';
import { Service } from 'typedi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';

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
