import { faker } from '@faker-js/faker';

// Node manifest stub

export const makeNodeManifest = (params?: any) => {
  const name = params?.name || faker.internet.domainWord();
  return {
    name,
    allowInternet: params?.allowInternet || false,
    isGateway: params?.isGateway || false,
    gatewayNetworks: params?.gatewayNetworks || null,
    enabled: params?.enabled !== undefined ? params.enabled : true,
    ...params,
  };
};

// Provider manifest stub

export const makeProviderManifest = (params?: any) => {
  const name = params?.name || faker.company.name();
  return {
    name,
    type: params?.type || 'google',
    issuerUrl: params?.issuerUrl || 'https://accounts.google.com',
    clientId:
      params?.clientId ||
      faker.string.alphanumeric(32) + '.apps.googleusercontent.com',
    clientSecret: params?.clientSecret || faker.string.alphanumeric(24),
    scopes: params?.scopes || 'openid profile email',
    enabled: params?.enabled !== undefined ? params.enabled : true,
    ...params,
  };
};

// Upstream manifest stub

export const makeUpstreamManifest = (params?: any) => {
  return {
    type: params?.type || 'prefix',
    pathPattern: params?.pathPattern || '/',
    targetProtocol: params?.targetProtocol || 'http',
    targetNodeRef: params?.targetNodeRef || undefined,
    targetHost: params?.targetHost || undefined,
    targetPort: params?.targetPort || faker.internet.port(),
    ...params,
  };
};

// Access rule manifest stub

export const makeAccessRuleManifest = (params?: any) => {
  return {
    enabled: params?.enabled !== undefined ? params.enabled : true,
    order: params?.order || faker.number.int({ min: 1, max: 1000 }),
    when: params?.when || {
      type: 'prefix',
      pathPattern: '/',
    },
    action: params?.action || {
      type: 'access.public',
    },
    predicate: params?.predicate || undefined,
    ...params,
  };
};

// Edge rule manifest stub

export const makeEdgeRuleManifest = (params?: any) => {
  return {
    enabled: params?.enabled !== undefined ? params.enabled : true,
    order: params?.order || faker.number.int({ min: 1, max: 1000 }),
    when: params?.when || {
      type: 'prefix',
      pathPattern: '/',
    },
    action: params?.action || {
      type: 'ip.allow',
      params: {
        cidrs: [faker.internet.ipv4() + '/24'],
      },
    },
    ...params,
  };
};

// HTTP resource manifest stub

export const makeHttpResourceManifest = (params?: any) => {
  const name = params?.name || faker.internet.domainWord();
  const domain = params?.domain || `${name}.${faker.internet.domainName()}`;
  return {
    name,
    domain,
    enabled: params?.enabled !== undefined ? params.enabled : true,
    providerRef: params?.providerRef || undefined,
    expiresAt: params?.expiresAt || undefined,
    upstreams: params?.upstreams || [],
    accessRules: params?.accessRules || [],
    edgeRules: params?.edgeRules || [],
    ...params,
  };
};

// Full stack manifest stub

export const makeStackManifest = (params?: any) => {
  return {
    apiVersion: 'wiredoor.io/v1alpha1',
    kind: 'Stack',
    nodes: params?.nodes || [],
    auth: params?.auth || { providers: [] },
    http: params?.http || [],
    ...params,
  };
};

// Node Scoped manifest stub

export const makeNodeScopedManifest = (params?: any) => {
  return {
    apiVersion: 'wiredoor.io/v1alpha1',
    kind: 'NodeConfig',
    http: params?.http || [],
    ...params,
  };
};

// Convenience: build a complete valid manifest

export const makeFullStackManifest = (params?: any) => {
  const nodeName = params?.nodeName || faker.internet.domainWord();
  const providerName = params?.providerName || faker.string.alphanumeric(8);
  const httpName = params?.httpName || faker.internet.domainWord();
  const domain = params?.domain || `${httpName}.${faker.internet.domainName()}`;

  return makeStackManifest({
    nodes: [makeNodeManifest({ name: nodeName })],
    auth: {
      providers: [makeProviderManifest({ name: providerName })],
    },
    http: [
      makeHttpResourceManifest({
        name: httpName,
        domain,
        providerRef: providerName,
        upstreams: [
          makeUpstreamManifest({
            pathPattern: '/',
            targetNodeRef: nodeName,
            targetPort: 3000,
          }),
        ],
        accessRules: [
          makeAccessRuleManifest({
            order: 1000,
            when: { type: 'prefix', pathPattern: '/' },
            action: { type: 'access.public' },
          }),
        ],
      }),
    ],
    ...params,
  });
};
