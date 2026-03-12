import { Schema } from 'joi';
import Joi from '../utils/joi-validator';

/**
 * Filter schemas
 */
export type HttpResourceFilterQueryParams = {
  q?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
};

export const httpResourceFilterValidator =
  Joi.object<HttpResourceFilterQueryParams>({
    q: Joi.string().allow('').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(250).optional(),
    orderBy: Joi.string().optional(),
    orderDir: Joi.string().valid('asc', 'desc').optional(),
  })
    .unknown(false)
    .prefs({ abortEarly: false });

/**
 * Types
 */
export type RuleMatchType = 'exact' | 'prefix' | 'regex';

export type RuleAction = 'public' | 'require_auth' | 'deny';

export type AccessVar =
  | 'user.email'
  | 'user.username'
  | 'user.subject'
  | 'user.name'
  | 'user.groups'
  | 'user.roles'
  | 'provider.type'
  | 'provider.issuerUrl'
  | 'provider.id'
  | 'request.method'
  | 'request.path'
  | 'request.host'
  | `user.claims.${string}`;

export type HttpPredicateV1 =
  | { v: 1; all: HttpPredicateV1[] }
  | { v: 1; any: HttpPredicateV1[] }
  | { v: 1; not: HttpPredicateV1 }
  | {
      v: 1;
      leaf: {
        op: 'eq' | 'neq' | 'in' | 'contains' | 'matches' | 'exists';
        left: { var: AccessVar };
        right?:
          | string
          | number
          | boolean
          | Array<string | number | boolean>
          | null;
      };
    };

export type EdgeAction =
  | { type: 'client.max_body_size'; params: { size: string } }
  | { type: 'ip.allow'; params: { cidrs: string[] } }
  | { type: 'ip.deny'; params: { cidrs: string[] } }
  | {
      type: 'response.header.set';
      params: { name: string; value: string; always?: boolean };
    }
  | { type: 'request.header.set'; params: { name: string; value: string } }
  | {
      type: 'rate_limit.req';
      params: {
        zone?: string;
        rate: string;
        burst?: number;
        nodelay?: boolean;
        key?: string;
        status?: 429 | 503;
      };
    }
  | {
      type: 'return';
      params: {
        code:
          | 301
          | 302
          | 307
          | 308
          | 401
          | 403
          | 404
          | 410
          | 418
          | 429
          | 444
          | 451
          | 500
          | 503;
        body?: string;
      };
    };

export type AccessRuleSpec = {
  id?: number;
  enabled?: boolean;
  order?: number;
  when: {
    type: RuleMatchType;
    pathPattern: string;
    methods?: string[] | null;
  };
  action: RuleAction; // 'public' | 'require_auth' | 'deny'
  predicate?: HttpPredicateV1 | null;
  upstreamPathPattern?: string;
};

export type EdgeRuleSpec = {
  id?: number;
  enabled?: boolean;
  order?: number;
  when: {
    type: RuleMatchType;
    pathPattern: string;
    methods?: string[] | null;
  };
  action: EdgeAction;
  upstreamPathPattern?: string;
};

export type ReconcileCounters = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
};

export type DeclarativeHttpResourceInput = HttpResourceType & {
  externalId: string;
};

export type DeclarativeHttpResourcePlanResult = {
  changed: boolean;
  resourceChanged: boolean;
  upstreams: ReconcileCounters;
  accessRules: ReconcileCounters;
  edgeRules: ReconcileCounters;
};

export type DeclarativeReconcileMode = 'plan' | 'apply';

/*
 * Access Rule Spec validator
 */
const httpMethodValidator = Joi.string()
  .valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')
  .messages({ 'any.only': 'Invalid HTTP method' });

export const methodsValidator = Joi.array()
  .items(httpMethodValidator)
  .min(1)
  .unique()
  .optional();

const exactPathValidator = Joi.string()
  .pattern(/^\//)
  .messages({ 'string.pattern.base': 'exact path must start with /' });

const prefixPathValidator = Joi.string()
  .pattern(/^\//)
  .messages({ 'string.pattern.base': 'prefix path must start with /' });

const regexPatternValidator = Joi.string().min(1);

export const whenSchemaValidator = Joi.object({
  path: Joi.alternatives()
    .try(
      Joi.object({ exact: exactPathValidator.required() }).required(),
      Joi.object({ prefix: prefixPathValidator.required() }).required(),
      Joi.object({ regex: regexPatternValidator.required() }).required(),
    )
    .required(),
  methods: methodsValidator,
})
  .custom((value, helpers) => {
    if (value?.path?.regex) {
      try {
        // Always case-insensitive by design
        // eslint-disable-next-line no-new
        new RegExp(value.path.regex, 'i');
      } catch {
        return helpers.error('any.custom', {
          message: 'Invalid regex in when.path.regex',
        });
      }
    }
    return value;
  }, 'regex compilation validation')
  .messages({
    'any.custom': '{{#message}}',
  });

const ruleActionValidator = Joi.string().valid(
  'public',
  'require_auth',
  'deny',
);

const AllowedVars = new Set([
  'user.email',
  'user.username',
  // 'user.subject',
  'user.name',
  'user.groups',
  'user.roles',
  // 'provider.type',
  // 'provider.issuerUrl',
  // 'provider.id',
  // 'request.method',
  // 'request.path',
  // 'request.host',
]);

const varRefSchemaValidator = Joi.object({
  var: Joi.string()
    .min(1)
    .required()
    .custom((v: string, helpers) => {
      if (AllowedVars.has(v)) return v;
      if (v.startsWith('user.claims.')) return v;
      return helpers.error('any.custom', {
        message: `Invalid variable reference: ${v}`,
      });
    }, 'var allow-list'),
}).required();

const leafOpSchemaValidator = Joi.object({
  op: Joi.string()
    .valid('eq', 'neq', 'in', 'contains', 'matches', 'exists')
    .required(),
  left: varRefSchemaValidator,
  right: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.array()
        .items(
          Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()),
        )
        .min(1),
      Joi.valid(null),
    )
    .optional(),
})
  .custom((leaf, helpers) => {
    const op = leaf.op as string;

    if (op === 'exists') {
      if (leaf.right !== undefined) {
        return helpers.error('any.custom', {
          message: 'exists must not have "right"',
        });
      }
      return leaf;
    }

    if (leaf.right === undefined) {
      return helpers.error('any.custom', { message: `${op} requires "right"` });
    }

    if (op === 'matches') {
      if (typeof leaf.right !== 'string') {
        return helpers.error('any.custom', {
          message: 'matches requires right to be a string regex',
        });
      }
      try {
        // Always case-insensitive by design
        // eslint-disable-next-line no-new
        new RegExp(leaf.right, 'i');
      } catch {
        return helpers.error('any.custom', {
          message: 'Invalid regex in matches',
        });
      }
    }

    return leaf;
  }, 'leaf operator validation')
  .messages({ 'any.custom': '{{#message}}' });

export const predicateValidator: Schema = Joi.object<HttpPredicateV1>()
  .keys({
    v: Joi.number().valid(1).required(),

    all: Joi.array().items(Joi.link('#httpPredicateNode')).min(1),
    any: Joi.array().items(Joi.link('#httpPredicateNode')).min(1),
    not: Joi.link('#httpPredicateNode'),

    leaf: leafOpSchemaValidator,
  })
  .xor('all', 'any', 'not', 'leaf')
  .id('httpPredicateNode')
  .messages({
    'object.xor': 'Predicate must have exactly one of: all, any, not, leaf',
  });

export const accessRuleSpecSchemaValidator = Joi.object({
  name: Joi.string().min(1).max(128).required(),
  enabled: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).max(1_000_000).optional(),

  when: whenSchemaValidator.required(),

  action: ruleActionValidator.required(),

  predicate: predicateValidator.optional(),
})
  .custom((rule, helpers) => {
    // predicate is typically meaningful only for require_auth.
    if (rule.predicate && rule.action?.type === 'access.public') {
      return helpers.error('any.custom', {
        message: 'predicate is ignored for access.public (remove it)',
      });
    }
    return rule;
  }, 'cross-field validation')
  .messages({ 'any.custom': '{{#message}}' });

/**
 * Edge Rule Spec validator
 */
const HeaderName = Joi.string()
  .pattern(/^[A-Za-z0-9-]+$/)
  .messages({ 'string.pattern.base': 'Invalid header name' });

const NonEmpty = Joi.string().min(1);

const ZoneName = Joi.string()
  .pattern(/^[a-zA-Z0-9_.-]{1,64}$/)
  .messages({ 'string.pattern.base': 'Invalid zone name' });

const Rate = Joi.string()
  .pattern(/^\d+r\/(s|m|h|d)$/i)
  .messages({ 'string.pattern.base': 'rate must look like 10r/s' });

export const edgeActionSchemaValidator = Joi.object({
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
  .custom((value, helpers) => {
    const t = value.type as string;
    const p = value.params ?? {};
    const keys = Object.keys(p);

    const unknownKeys = (allowed: string[]) =>
      keys.filter((k) => !allowed.includes(k));

    if (t === 'ip.allow' || t === 'ip.deny') {
      const bad = unknownKeys(['cidrs']);
      if (bad.length)
        return helpers.error('any.custom', {
          message: `Unknown params for ${t}: ${bad.join(', ')}`,
        });

      const schema = Joi.object({
        cidrs: Joi.array()
          .items(Joi.string().ip({ cidr: 'optional' }).required())
          .min(1)
          .required(),
      });

      const { error } = schema.validate(p, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) return helpers.error('any.custom', { message: error.message });

      return value;
    }

    if (t === 'request.header.set') {
      const bad = unknownKeys(['name', 'value']);
      if (bad.length)
        return helpers.error('any.custom', {
          message: `Unknown params for ${t}: ${bad.join(', ')}`,
        });

      const schema = Joi.object({
        name: HeaderName.required(),
        value: NonEmpty.required(),
      });

      const { error } = schema.validate(p, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) return helpers.error('any.custom', { message: error.message });

      return value;
    }

    if (t === 'response.header.set') {
      const bad = unknownKeys(['name', 'value', 'always']);
      if (bad.length)
        return helpers.error('any.custom', {
          message: `Unknown params for ${t}: ${bad.join(', ')}`,
        });

      const schema = Joi.object({
        name: HeaderName.required(),
        value: NonEmpty.required(),
        always: Joi.boolean().optional(),
      });

      const { error } = schema.validate(p, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) return helpers.error('any.custom', { message: error.message });

      return value;
    }

    if (t === 'rate_limit.req') {
      const bad = unknownKeys([
        'zone',
        'rate',
        'burst',
        'nodelay',
        'key',
        'status',
      ]);
      if (bad.length)
        return helpers.error('any.custom', {
          message: `Unknown params for ${t}: ${bad.join(', ')}`,
        });

      // NOTE: "key" should ideally be a whitelist of supported nginx variables.
      // If you keep it free-form, you must ensure it can't inject semicolons/newlines when compiling.
      const schema = Joi.object({
        zone: ZoneName.required(),
        rate: Rate.required(),
        burst: Joi.number().integer().min(0).max(100000).optional(),
        nodelay: Joi.boolean().optional(),
        key: Joi.string().max(128).optional(), // keep short; also sanitize on compile
        status: Joi.number().valid(429, 503).optional(),
      });

      const { error } = schema.validate(p, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) return helpers.error('any.custom', { message: error.message });

      return value;
    }

    if (t === 'return') {
      const bad = unknownKeys(['code', 'body']);
      if (bad.length)
        return helpers.error('any.custom', {
          message: `Unknown params for ${t}: ${bad.join(', ')}`,
        });

      const schema = Joi.object({
        code: Joi.number()
          .valid(
            301,
            302,
            307,
            308,
            401,
            403,
            404,
            410,
            418,
            429,
            444,
            451,
            500,
            503,
          )
          .required(),
        body: Joi.string().max(4096).optional(),
      });

      const { error } = schema.validate(p, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) return helpers.error('any.custom', { message: error.message });

      return value;
    }

    return helpers.error('any.custom', {
      message: `Unsupported edge action type: ${t}`,
    });
  }, 'edge action validation')
  .messages({ 'any.custom': '{{#message}}' });

export const edgeRuleSpecSchemaValidator = Joi.object({
  name: Joi.string().min(1).max(128).required(),
  enabled: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).max(1_000_000).optional(),

  when: whenSchemaValidator.required(),

  action: edgeActionSchemaValidator.required(),
}).messages({ 'any.custom': '{{#message}}' });

export type HttpRewrite = {
  pattern: string;
  replacement: string;
  flag?: 'last' | 'break' | 'redirect' | 'permanent';
};

export type HttpUpstreamSpec = {
  id?: number;
  type: RuleMatchType; // 'prefix' | 'exact' | 'regex'
  pathPattern: string;
  rewrite?: HttpRewrite;
  targetProtocol: 'http' | 'https';
  targetHost?: string;
  targetPort: number;
  targetSslVerify?: boolean;
  targetNodeId?: number;
};

export const regexPathValidator = Joi.string()
  .trim()
  .pattern(/^[^\r\n;]+$/)
  .messages({
    'string.pattern.base': 'pathPattern contains invalid characters',
  });

export const pathValidator = Joi.string()
  .trim()
  .pattern(/^\/.*$/)
  .messages({
    'string.pattern.base': 'pathPattern must start with /',
  });

export const ruleMatchTypeValidator = Joi.string()
  .valid('exact', 'prefix', 'regex')
  .required();

export const pathPatternValidator = Joi.alternatives()
  .conditional('type', {
    is: 'regex',
    then: regexPathValidator.required(),
    otherwise: pathValidator.required(),
  })
  .required();

export const pathRewriteValidator = Joi.object<HttpRewrite>({
  pattern: regexPathValidator.required(),
  replacement: Joi.string().trim().required(),
  flag: Joi.string()
    .allow('', null)
    .valid('last', 'break', 'redirect', 'permanent')
    .optional(),
})
  .allow(null)
  .optional();

export const httpUpstreamValidator = Joi.object<HttpUpstreamSpec>({
  id: Joi.number().integer().positive().optional(),

  type: ruleMatchTypeValidator,

  pathPattern: pathPatternValidator,

  rewrite: pathRewriteValidator,

  targetProtocol: Joi.string().valid('http', 'https').required(),

  targetHost: Joi.alternatives()
    .try(
      Joi.string().hostname(),
      Joi.string().ip({ version: ['ipv4'], cidr: 'forbidden' }),
      Joi.string().ip({ version: ['ipv6'], cidr: 'forbidden' }),
    )
    .messages({
      'alternatives.match': 'targetHost must be a valid hostname or IP address',
    })
    .optional(),

  targetPort: Joi.number().integer().min(1).max(65535).required(),

  targetSslVerify: Joi.boolean().optional(),

  targetNodeId: Joi.number().integer().positive().optional(),
})
  .required()
  .custom((value, helpers) => {
    const hasNode = value.targetNodeId != null;
    const hasHost =
      value.targetHost != null && String(value.targetHost).trim() !== '';

    // Require exactly one target source (avoid ambiguous routing)
    if (!hasNode && !hasHost) {
      return helpers.error('any.custom', {
        message: 'Either targetNodeId or targetHost is required',
      });
    }
    if (hasNode && hasHost) {
      return helpers.error('any.custom', {
        message: 'Provide only one of targetNodeId or targetHost (not both)',
      });
    }

    // targetSslVerify semantics
    if (value.targetProtocol === 'http' && value.targetSslVerify === true) {
      return helpers.error('any.custom', {
        message:
          'targetSslVerify can only be true when targetProtocol is https',
      });
    }

    // Extra safety: if type is exact, enforce pathPattern is not "/"? (optional)
    // if (value.type === 'exact' && value.pathPattern === '/') { ... }

    // Optional: enforce rewrite format if you use nginx rewrite rules
    // - if you implement "proxy_pass ...<uri>" style rewrites, you may want:
    //   rewrite must start with "/" and contain no spaces
    if (value.rewrite) {
      const rw = value.rewrite.trim();
      if (rw.length === 0) {
        value.rewrite = undefined;
      } else {
        // If you expect rewrite to be a URI path, enforce leading "/"
        // (If you accept other syntaxes, remove this.)
        if (!rw.startsWith('/')) {
          return helpers.error('any.custom', {
            message: 'rewrite must start with /',
          });
        }
      }
    }

    // If regex type, sanity-check it compiles (JS regex syntax close enough for basic validation)
    if (value.type === 'regex') {
      try {
        // nginx uses PCRE; JS regex is not identical but catches obvious errors
        // Also force case-insensitive in nginx generation, so do not accept inline flags here
        // (If you want to allow inline (?i), remove this.)
        // eslint-disable-next-line no-new
        new RegExp(value.pathPattern);
      } catch {
        return helpers.error('any.custom', {
          message: 'pathPattern is not a valid regular expression',
        });
      }
    }

    return value;
  }, 'HttpUpstream cross-field validation')
  .messages({
    'any.custom': '{{#message}}',
  })
  .options({ abortEarly: false, allowUnknown: false, stripUnknown: true });

export type HttpResourceType = {
  name: string;
  domain?: string;
  enabled?: boolean;
  expiresAt?: Date;
  oidcProviderId?: number;
  httpUpstreams?: HttpUpstreamSpec[];
  accessRules?: AccessRuleSpec[];
  edgeRules?: EdgeRuleSpec[];
};

export const httpResourceValidator = Joi.object<HttpResourceType>({
  name: Joi.string().min(1).max(128).required(),
  domain: Joi.string().hostname().optional(),
  enabled: Joi.boolean().optional(),
  expiresAt: Joi.date().iso().greater('now').optional(),
  oidcProviderId: Joi.number().integer().positive().optional(),
  httpUpstreams: Joi.array().items(httpUpstreamValidator).optional(),
  accessRules: Joi.array().items(accessRuleSpecSchemaValidator).optional(),
  edgeRules: Joi.array().items(edgeRuleSpecSchemaValidator).optional(),
})
  .unknown(false)
  .prefs({ abortEarly: false });
