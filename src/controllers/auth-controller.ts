import {
  Body,
  CurrentUser,
  Get,
  JsonController,
  Post,
  Req,
  UseBefore,
} from 'routing-controllers';
import { Request } from 'express';
import { Inject, Service } from 'typedi';
import { AdminAuthService, JWTResponse } from '../services/admin-auth-service';
import { celebrate, Joi } from 'celebrate';
import rateLimit from 'express-rate-limit';
import {
  AuthenticatedUser,
  AuthTokenHandler,
} from '../middlewares/auth-token-handler';

@Service()
@JsonController('/auth')
export default class AuthController {
  constructor(@Inject() private readonly authService: AdminAuthService) {}

  @Get('/me')
  @UseBefore(
    rateLimit({
      windowMs: 60 * 1000, // 1min
      max: 60,
      message: 'Rate Limit exceeded',
    }),
    AuthTokenHandler,
  )
  async getUser(
    @CurrentUser({ required: true }) user: AuthenticatedUser,
  ): Promise<AuthenticatedUser> {
    return user;
  }

  @Post('/login')
  @UseBefore(
    celebrate({
      body: {
        username: Joi.string().required(),
        password: Joi.string().required(),
      },
    }),
    rateLimit({
      windowMs: 10 * 60 * 1000, // 10min
      max: 5,
      message: 'Rate Limit exceeded',
    }),
  )
  async authenticate(
    @Req() req: Request,
    @Body() params: { username: string; password: string },
  ): Promise<JWTResponse> {
    try {
      req.logger.audit(`Authentication attempt for user ${params.username}`);

      const response = await this.authService.auth(
        params.username,
        params.password,
      );

      req.logger.audit(`Authentication successful for user ${params.username}`);

      return response;
    } catch (error: Error | any) {
      req.logger.error('Error logging authentication attempt', error);
      throw error;
    }
  }
}
