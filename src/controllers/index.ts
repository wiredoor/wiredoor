import AuthController from './auth-controller';
import NodeController from './node-controller';
import NodeServiceController from './node-service-controller';
import CLiController from './cli-controller';
import DomainController from './domain-controller';
import ConfigController from './config-controller';
import LogController from './log-controller';
import AuthWebController from './auth-web-controller';
import HttpResourceController from './http-resource-controller';
import IacStackController from './iac-stack-controller';
// PLOP_IMPORTS

const controllers = [
  AuthController,
  ConfigController,
  DomainController,
  NodeController,
  NodeServiceController,
  CLiController,
  LogController,
  AuthWebController,
  HttpResourceController,
  IacStackController,
  // PLOP_CONTROLLERS
];

export default controllers;
