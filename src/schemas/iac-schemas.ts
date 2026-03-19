import Joi from 'joi';
import {
  EdgeAction,
  HttpPredicateV1,
  HttpRewrite,
  methodsValidator,
  pathPatternValidator,
  pathRewriteValidator,
  predicateValidator,
  RuleMatchType,
  ruleMatchTypeValidator,
} from './http-resource-schemas';

export type NodeManifest = {
  name: string;
  dns?: string;
  keepalive?: number;
  address?: string;
  interface?: string;
  allowInternet?: boolean;
  advanced?: boolean;
  enabled?: boolean;
  gatewayNetworks?: {
    interface: string;
    subnet: string;
  }[];
  isGateway?: boolean;
};

export type OidcProviderManifest = {
  name: string;
  type: 'google' | 'keycloak' | 'azuread' | 'generic';
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes?: string;
  claimMappings?: Record<string, string>;
  extraParams?: Record<string, string>;
  enabled?: boolean;
};

export type HttpUpstreamManifest = {
  type: RuleMatchType;
  pathPattern: string;
  rewrite?: HttpRewrite;
  targetProtocol: 'http' | 'https';
  targetHost?: string;
  targetPort: number;
  targetSslVerify?: boolean;
  targetNodeRef?: string;
};

export type HttpAccessRuleManifest = {
  enabled?: boolean;
  order?: number;
  when: {
    type: RuleMatchType;
    pathPattern: string;
    methods?: string[] | null;
  };
  action: {
    type: 'access.public' | 'access.require_auth' | 'access.deny';
    params?: {
      onUnauthenticated?: 'redirect' | '401';
      status?: 403 | 404;
    };
  };
  predicate?: HttpPredicateV1 | null;
  upstreamRef?: string;
};

export type HttpEdgeRuleManifest = {
  enabled?: boolean;
  order?: number;
  when: {
    type: RuleMatchType;
    pathPattern: string;
    methods?: string[] | null;
  };
  action: EdgeAction;
  upstreamRef?: string;
};

export type HttpResourceManifest = {
  name: string;
  domain: string;
  enabled: boolean;
  providerRef?: string;
  expiresAt?: string;
  upstreams: HttpUpstreamManifest[];
  accessRules?: HttpAccessRuleManifest[];
  edgeRules?: HttpEdgeRuleManifest[];
};

export type StackManifest = {
  apiVersion: 'wiredoor.io/v1alpha1';
  kind: 'Stack';
  nodes?: NodeManifest[];
  auth?: {
    providers?: OidcProviderManifest[];
  };
  http?: HttpResourceManifest[];
};

export type NodeScopedManifest = {
  apiVersion: 'wiredoor.io/v1alpha1';
  kind: 'NodeConfig';
  http?: (HttpResourceManifest & {
    upstreams?: Omit<HttpUpstreamManifest, 'targetNodeRef'>[];
  })[];
};

const externalIdValidator = Joi.string()
  .trim()
  .pattern(/^[a-zA-Z0-9._-]+$/)
  .min(1)
  .max(128)
  .required();

export const nodeManifestValidator = Joi.object<NodeManifest>({
  name: externalIdValidator,
  dns: Joi.string().optional(),
  keepalive: Joi.number().integer().min(0).optional(),
  address: Joi.string().optional(),
  interface: Joi.string().optional(),
  allowInternet: Joi.boolean().optional(),
  advanced: Joi.boolean().optional(),
  enabled: Joi.boolean().optional(),
  gatewayNetworks: Joi.array()
    .items(
      Joi.object({
        interface: Joi.string().required(),
        subnet: Joi.string().ip({ cidr: 'required' }).required(),
      }),
    )
    .optional(),
  isGateway: Joi.boolean().optional(),
});

export const oidcProviderManifestValidator = Joi.object<OidcProviderManifest>({
  name: externalIdValidator,
  type: Joi.string()
    .valid('google', 'keycloak', 'azuread', 'generic')
    .required(),
  issuerUrl: Joi.string().uri().required(),
  clientId: Joi.string().required(),
  clientSecret: Joi.string().required(),
  scopes: Joi.string().optional(),
  claimMappings: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  extraParams: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  enabled: Joi.boolean().optional(),
});

export const httpResourceManifestValidator = Joi.object<HttpResourceManifest>({
  name: externalIdValidator,
  domain: Joi.string().hostname().required(),
  enabled: Joi.boolean().required(),
  providerRef: externalIdValidator.optional(),
  expiresAt: Joi.date().iso().optional(),

  upstreams: Joi.array()
    .items(
      Joi.object<HttpUpstreamManifest>({
        type: ruleMatchTypeValidator,
        pathPattern: pathPatternValidator,
        rewrite: pathRewriteValidator,
        targetProtocol: Joi.string().valid('http', 'https').required(),
        targetHost: Joi.string().optional(),
        targetPort: Joi.number().integer().min(1).max(65535).required(),
        targetSslVerify: Joi.boolean().optional(),
        targetNodeRef: externalIdValidator.optional(),
      }).unknown(false),
    )
    .min(1)
    .required(),

  accessRules: Joi.array()
    .items(
      Joi.object<HttpAccessRuleManifest>({
        enabled: Joi.boolean().optional(),
        order: Joi.number().integer().min(0).optional(),
        when: Joi.object({
          type: ruleMatchTypeValidator,
          pathPattern: pathPatternValidator,
          methods: methodsValidator,
        })
          .unknown(false)
          .required(),
        action: Joi.object({
          type: Joi.string()
            .valid('access.public', 'access.require_auth', 'access.deny')
            .required(),
          params: Joi.object({
            onUnauthenticated: Joi.string().valid('redirect', '401').optional(),
            status: Joi.number().valid(403, 404).optional(),
          })
            .unknown(false)
            .optional(),
        })
          .unknown(false)
          .required(),
        predicate: predicateValidator.optional(),
        upstreamRef: externalIdValidator.optional(),
      }).unknown(false),
    )
    .default([]),

  edgeRules: Joi.array()
    .items(
      Joi.object<HttpEdgeRuleManifest>({
        enabled: Joi.boolean().optional(),
        order: Joi.number().integer().min(0).optional(),
        when: Joi.object({
          type: ruleMatchTypeValidator,
          pathPattern: pathPatternValidator,
          methods: methodsValidator,
        })
          .unknown(false)
          .required(),
        action: Joi.object({
          type: Joi.string()
            .valid(
              'ip.allow',
              'ip.deny',
              'request.header.set',
              'response.header.set',
              'rate_limit.req',
              'return',
            )
            .required(),
          params: Joi.object().required(),
        })
          .unknown(false)
          .required(),
        upstreamRef: externalIdValidator.optional(),
      }),
    )
    .default([]),
}).unknown(false);

export const nodeScopedManifestValidator = Joi.object<NodeScopedManifest>({
  apiVersion: Joi.string().valid('wiredoor.io/v1alpha1').required(),
  kind: Joi.string().valid('NodeConfig').required(),

  http: Joi.array()
    .items(httpResourceManifestValidator.unknown(false))
    .default([]),
}).unknown(false);

export const stackManifestValidator = Joi.object<StackManifest>({
  apiVersion: Joi.string().valid('wiredoor.io/v1alpha1').required(),
  kind: Joi.string().valid('Stack').required(),

  nodes: Joi.array().items(nodeManifestValidator.unknown(false)).default([]),

  auth: Joi.object({
    providers: Joi.array()
      .items(oidcProviderManifestValidator.unknown(false))
      .default([]),
  })
    .default({ providers: [] })
    .optional(),

  http: Joi.array()
    .items(httpResourceManifestValidator.unknown(false))
    .default([]),
})
  .unknown(false)
  .prefs({ abortEarly: false, stripUnknown: false });
