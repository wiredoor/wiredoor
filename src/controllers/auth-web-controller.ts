import {
  Body,
  Get,
  JsonController,
  Post,
  Req,
  Res,
  UnauthorizedError,
  UseBefore,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { Inject, Service } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import rateLimit from 'express-rate-limit';
import { AuthTokenHandler } from '../middlewares/auth-token-handler';
import { SessionService } from '../services/sessions-service';
import { UsersService } from '../services/users-service';
import config from '../config';

@Service()
@JsonController('/auth/web')
export default class AuthWebController {
  constructor(
    @Inject() private readonly usersService: UsersService,
    @Inject() private readonly sessionsService: SessionService,
  ) {}

  @Get('/me')
  @UseBefore(
    rateLimit({
      windowMs: 60 * 1000, // 1min
      max: 60,
      message: 'Rate Limit exceeded',
    }),
    AuthTokenHandler,
  )
  async me(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response<{ user: { id: string; email: string } | null }>> {
    const sid = (req as any).cookies?.sid;
    if (!sid) return res.status(401).json({ user: null });

    const session = await this.sessionsService.getValidSessionBySid(sid);
    if (!session) return res.status(401).json({ user: null });

    const user = await this.usersService.findById(session.userId);
    if (!user) return res.status(401).json({ user: null });

    return res.json({
      user: { id: user.id, email: user.email },
    });
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
    @Res() res: Response,
    @Body() params: { username: string; password: string },
  ): Promise<Response<{ id: string; name: string; email: string }>> {
    req.logger.info(
      `Web login attempt from IP: ${req.ip}. Username: ${params.username}`,
    );
    const user = await this.usersService.validateCredentials(
      params.username,
      params.password,
    );

    if (!user) throw new UnauthorizedError('Invalid credentials');

    const { sid } = await this.sessionsService.createSession({
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['device-id'] as string | undefined,
    });

    res.cookie(config.session.name, sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.json({ id: user.id, name: user.name, email: user.email });
  }

  @Post('/logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response<{ ok: true }>> {
    const sid = (req as any).cookies?.sid;
    if (sid) await this.sessionsService.revokeSessionBySid(sid);

    res.clearCookie(config.session.name, { path: '/' });
    return res.json({ ok: true });
  }
}
