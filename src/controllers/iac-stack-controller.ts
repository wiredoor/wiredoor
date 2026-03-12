import BaseController from './base-controller';
import {
  Get,
  JsonController,
  Post,
  Req,
  Res,
  UseBefore,
} from 'routing-controllers';
import { Inject, Service } from 'typedi';
import {
  StackReconciler,
  StackReconcileResult,
} from '../core/reconciler/stack-reconciler';
import { Request, Response } from 'express';
import YAML from 'yaml';
import { StackIaCService } from '../services/stack-iac-service';

export function parseBody(req: Request): Record<string, unknown> {
  const contentType = req.headers['content-type'] ?? '';

  if (
    contentType.includes('yaml') ||
    contentType.includes('x-yaml') ||
    contentType.includes('text/plain')
  ) {
    return YAML.parse(req.body);
  }

  return req.body;
}

@Service()
@JsonController('/iac')
@UseBefore()
export default class IacStackController extends BaseController {
  constructor(
    @Inject('reconciler') private readonly reconciler: StackReconciler,
    @Inject() private readonly stackService: StackIaCService,
  ) {
    super();
  }

  @Get('/export')
  async exportStack(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const manifest = await this.stackService.export();
    const yaml = YAML.stringify(manifest);
    const format = req.query.format ?? 'yaml';
    const filename = req.query.filename ?? 'wiredoor';

    if (format === 'json') {
      return res.json(manifest);
    }

    return res
      .set('Content-Type', 'application/x-yaml')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.yaml"`,
      )
      .send(yaml);
  }

  @Post('/validate')
  async validateStack(@Req() req: Request, @Res() res: Response) {
    const manifest = parseBody(req);
    const result = await this.reconciler.validate(manifest);

    if (result.valid) {
      return res.json(result);
    } else {
      return res.status(422).json(result);
    }
  }

  @Post('/plan')
  async planStack(@Req() req: Request): Promise<StackReconcileResult> {
    const manifest = parseBody(req);
    const result = await this.reconciler.reconcile(manifest, 'plan');
    return result;
  }

  @Post('/apply')
  async applyStack(@Req() req: Request): Promise<StackReconcileResult> {
    const manifest = parseBody(req);
    const result = await this.reconciler.reconcile(manifest, 'apply');
    return result;
  }
}
