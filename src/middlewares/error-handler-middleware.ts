import { HttpError } from 'routing-controllers';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors/validation-error';
import { isCelebrateError } from 'celebrate';

export function errorHandlerMiddleware(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void | Response<unknown, Record<string, unknown>> {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'QueryFailedError') {
    const msg = err.message || '';

    if (msg && msg.includes('UNIQUE constraint failed')) {
      const match = msg.match(/UNIQUE constraint failed: (.+)/);
      if (match) {
        const fields = match[1]
          .split(',')
          .map((f) => f.split('.').pop()?.trim() || '');
        return res.status(422).send({
          message: 'Validation failed',
          errors: {
            body: fields.map((f) => ({
              field: f,
              message: `Record already exists with the same value in ${fields.join(', ')}`,
            })),
          },
        });
      }
    }
  }

  if (isCelebrateError(err)) {
    const validation = {};

    for (const [segment, joiError] of err.details.entries()) {
      validation[segment] = joiError.details.map((detail) => {
        return {
          field: detail.path.join('.'),
          message: detail.message,
        };
      });
    }

    return res.status(422).send({
      message: 'Validation failed',
      errors: validation,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(422).send({
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  if (err instanceof HttpError) {
    res.status(err.httpCode);
  } else {
    res.status(400);
  }

  return res.json({
    status: 'error',
    message: err.message || 'Unknown error',
  });
}
