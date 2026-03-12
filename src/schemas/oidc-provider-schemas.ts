import Joi from 'joi';

/**
 * Public types for controller/service.
 * Keep these stable: Plop-generated controllers import these symbols by name.
 */

/**
 * Query params for list endpoint.
 * Extend safely as your filtering grows.
 */
export type OidcProviderFilterQueryParams = {
  q?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
};

export type OidcProvidersType = 'google' | 'keycloak' | 'azuread' | 'generic'; // used for UI presets, but ultimately it's just a string field and can be extended as needed

/**
 * Strongly-typed payload for create/update.
 * This is intentionally minimal because Plop cannot infer your domain fields.
 * Add required/optional fields here per model.
 */
export type OidcProviderType = {
  id?: number;
  name: string;
  type: OidcProvidersType;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes?: string;
  claimMappings?: Record<string, string>;
  extraParams?: Record<string, string>;
  enabled?: boolean;
};

/**
 * Optional: patch payload type (if you want PATCH to accept partials).
 * If you prefer full replacement semantics, delete this and use OidcProviderType in PATCH.
 */
export type OidcProviderPatchType = Partial<OidcProviderType>;

/**
 * Joi validators (celebrate expects Joi schemas).
 */
export const oidcProviderFilterValidator =
  Joi.object<OidcProviderFilterQueryParams>({
    q: Joi.string().allow('').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(250).optional(),
    orderBy: Joi.string().optional(),
    orderDir: Joi.string().valid('asc', 'desc').optional(),
  })
    .unknown(false)
    .prefs({ abortEarly: false });

export const oidcProviderValidator = Joi.object<OidcProviderType>({
  name: Joi.string().required(),
  type: Joi.string().valid('google', 'keycloak', 'azuread', 'generic'),
  issuerUrl: Joi.string().uri().required(),
  clientId: Joi.string().required(),
  clientSecret: Joi.string().required(),
  scopes: Joi.string().optional(),
  claimMappings: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  extraParams: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  enabled: Joi.boolean().optional(),
})
  .unknown(false)
  .prefs({ abortEarly: false });

/**
 * Optional: separate validator for PATCH if you want partial updates.
 * In that case, update controller to use oidcProviderPatchValidator + OidcProviderPatchType.
 */
export const oidcProviderPatchValidator = Joi.object<OidcProviderPatchType>({
  // Example:
  // name: Joi.string().min(2).max(128).optional(),
})
  .unknown(false)
  .prefs({ abortEarly: false });

/**
 * Common param validators.
 * Keep consistent across controllers.
 */
export const idParamValidator = Joi.object<{ id: string }>({
  id: Joi.string().required(),
}).prefs({ abortEarly: false });
