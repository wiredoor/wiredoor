import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import { Container } from 'typedi';
import { Action, useContainer, useExpressServer } from 'routing-controllers';
import AuthController from '../controllers/auth-controller';
import NodeController from '../controllers/node-controller';
import NodeServiceController from '../controllers/node-service-controller';
import CLiController from '../controllers/cli-controller';
import DomainController from '../controllers/domain-controller';
import ConfigController from '../controllers/config-controller';
import LogController from '../controllers/log-controller';
import { errorHandlerMiddleware } from '../middlewares/error-handler-middleware';
import { httpLogger } from './logger';

export default ({ app }: { app: express.Application }): void => {
  app.use(compression());
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '100kb' }));

  app.use(httpLogger);

  // Express Routing Controllers
  useContainer(Container);
  useExpressServer(app, {
    routePrefix: 'api',
    defaultErrorHandler: false,
    controllers: [
      AuthController,
      ConfigController,
      DomainController,
      NodeController,
      NodeServiceController,
      CLiController,
      LogController,
    ],
    cors: {
      origin: function (origin, callback) {
        // We can use cors: Disabled by default
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(
          (o) => o.trim().replace(/^https?:\/\//, ''),
        );

        if (
          !origin ||
          !allowedOrigins ||
          allowedOrigins.length === 0 ||
          allowedOrigins.includes('*')
        ) {
          return callback(null, true);
        }

        try {
          const hostname = new URL(origin).hostname;

          if (allowedOrigins.includes(hostname)) {
            return callback(null, true);
          } else {
            return callback(new Error('Not allowed by CORS'));
          }
        } catch {
          callback(new Error('Invalid Origin'));
        }
      },
      credentials: true,
    },
    // authorizationChecker: async (action: Action) => {
    //   if (action.request.user) {
    //     return true;
    //   }

    //   return false;
    // },
    currentUserChecker: (action: Action) => {
      return action.request.user;
    },
  });

  app.use(errorHandlerMiddleware);
};
