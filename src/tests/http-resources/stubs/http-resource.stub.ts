import { faker } from '@faker-js/faker';
import {
  HttpResourceType,
  HttpUpstreamSpec,
  AccessRuleSpec,
  EdgeRuleSpec,
} from '../../../schemas/http-resource-schemas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeHttpResourceData = (params?: any): HttpResourceType => {
  return {
    name:
      params?.name ||
      faker.internet.domainWord() + faker.string.alphanumeric(4),
    domain:
      params && 'domain' in params
        ? params.domain
        : faker.internet.domainName(),
    enabled: params?.enabled ?? true,
    expiresAt: params?.expiresAt,
    oidcProviderId: params?.oidcProviderId,
    httpUpstreams: params?.httpUpstreams || [],
    accessRules: params?.accessRules || [],
    edgeRules: params?.edgeRules || [],
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeHttpUpstreamData = (params?: any): HttpUpstreamSpec => {
  return {
    type: params?.type || 'prefix',
    pathPattern: params?.pathPattern || '/',
    targetProtocol: params?.targetProtocol || 'http',
    targetHost: params?.targetHost || faker.internet.domainName(),
    targetPort: params?.targetPort || 80,
    targetSslVerify: params?.targetSslVerify ?? false,
    targetNodeId: params?.targetNodeId,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeAccessRuleData = (params?: any): AccessRuleSpec => {
  return {
    enabled: params?.enabled ?? true,
    order: params?.order || 1,
    when: {
      type: params?.when?.type || 'prefix',
      pathPattern: params?.when?.pathPattern || '/',
      methods: params?.when?.methods || null,
    },
    action: params?.action || 'public',
    predicate: params?.predicate || null,
    upstreamPathPattern: params?.upstreamPathPattern,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeEdgeRuleData = (params?: any): EdgeRuleSpec => {
  return {
    upstreamPathPattern: params?.upstreamPathPattern,
    enabled: params?.enabled !== undefined ? params.enabled : true,
    order: params?.order || faker.number.int({ min: 1, max: 1000 }),
    when: {
      type: params?.when?.type || 'prefix',
      pathPattern: params?.when?.pathPattern || '/',
      methods: params?.when?.methods || null,
    },
    action: params?.action || {
      type: 'ip.allow',
      params: {
        cidrs: [faker.internet.ipv4() + '/24'],
      },
    },
  };
};
