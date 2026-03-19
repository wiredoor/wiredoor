import supertest from 'supertest';
import { loadApp } from '../../main';
import TestAgent from 'supertest/lib/agent';
import config from '../../config';
import YAML from 'yaml';
import { faker } from '@faker-js/faker';

import {
  makeFullStackManifest,
  makeStackManifest,
  makeNodeManifest,
  makeProviderManifest,
  makeHttpResourceManifest,
  makeUpstreamManifest,
  makeAccessRuleManifest,
  makeEdgeRuleManifest,
} from './stubs/stack-manifest.stub';

let app: any;
let request: TestAgent;
let cookie: string | undefined;

beforeAll(async () => {
  app = await loadApp();
  request = supertest.agent(app);

  const res = await supertest(app).post('/api/auth/web/login').send({
    username: 'admin@example.com',
    password: 'admin',
  });

  expect(res.status).toBe(200);

  const setCookie = res.headers['set-cookie'] as unknown as
    | string[]
    | undefined;
  if (!setCookie) throw new Error('No Set-Cookie header returned');

  const sidCookie = setCookie.find((c) =>
    c.startsWith(`${config.session.name}=`),
  );
  if (!sidCookie) throw new Error('sid cookie not found in Set-Cookie');

  cookie = sidCookie.split(';')[0];
});

afterAll(async () => {});

// ─── Helper ─────────────────────────────────────────────────────

function sendYaml(method: 'post', path: string, manifest: any) {
  return request[method](path)
    .set('Cookie', cookie!)
    .set('Content-Type', 'text/plain')
    .send(YAML.stringify(manifest));
}

function sendJson(method: 'post', path: string, manifest: any) {
  return request[method](path)
    .set('Cookie', cookie!)
    .set('Content-Type', 'application/json')
    .send(manifest);
}

// ═══════════════════════════════════════════════════════════════════
// Authentication
// ═══════════════════════════════════════════════════════════════════

// describe('Stack API - Authentication', () => {
//   it('should reject unauthenticated on GET /api/iac/export', async () => {
//     const res = await request.get('/api/iac/export');
//     expect(res.status).toBe(401);
//   });

//   it('should reject unauthenticated on POST /api/iac/validate', async () => {
//     const res = await request.post('/api/iac/validate').send({});

//     expect(res.status).toBe(401);
//   });

//   it('should reject unauthenticated on POST /api/iac/plan', async () => {
//     const res = await request.post('/api/iac/plan').send({});

//     expect(res.status).toBe(401);
//   });

//   it('should reject unauthenticated on POST /api/iac/apply', async () => {
//     const res = await request.post('/api/iac/apply').send({});

//     expect(res.status).toBe(401);
//   });
// });

// ═══════════════════════════════════════════════════════════════════
// GET /api/iac/export
// ═══════════════════════════════════════════════════════════════════
describe('GET /api/iac/export', () => {
  it('should return YAML by default', async () => {
    const res = await request.get('/api/iac/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('yaml');
    expect(res.headers['content-disposition']).toContain('wiredoor.yaml');

    // Should be valid YAML
    const parsed = YAML.parse(res.text);
    expect(parsed.apiVersion).toBe('wiredoor.io/v1alpha1');
    expect(parsed.kind).toBe('Stack');
  });

  it('should return JSON when ?format=json', async () => {
    const res = await request.get('/api/iac/export?format=json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('json');
    expect(res.body.apiVersion).toBe('wiredoor.io/v1alpha1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/iac/validate
// ═══════════════════════════════════════════════════════════════════

describe('POST /api/iac/validate', () => {
  it('should return 200 with valid: true for a valid manifest (YAML)', async () => {
    const manifest = makeFullStackManifest();

    const res = await sendYaml('post', '/api/iac/validate', manifest);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.errors).toHaveLength(0);
  });

  it('should return 200 with valid: true for a valid manifest (JSON)', async () => {
    const manifest = makeFullStackManifest();

    const res = await sendJson('post', '/api/iac/validate', manifest);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('should return 422 for duplicate names', async () => {
    const manifest = makeStackManifest({
      nodes: [
        makeNodeManifest({ name: 'dup' }),
        makeNodeManifest({ name: 'dup' }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/validate', manifest);

    expect(res.status).toBe(422);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('should return 422 for unresolved providerRef', async () => {
    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ name: 'n1' })],
      http: [
        makeHttpResourceManifest({
          providerRef: 'ghost-provider',
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 3000 }),
          ],
        }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/validate', manifest);

    expect(res.status).toBe(422);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some((e: any) => e.code === 'UNRESOLVED_REF')).toBe(
      true,
    );
  });

  it('should return 422 for unresolved targetNodeRef', async () => {
    const manifest = makeStackManifest({
      http: [
        makeHttpResourceManifest({
          upstreams: [
            makeUpstreamManifest({
              targetNodeRef: 'nonexistent-node',
              targetPort: 3000,
            }),
          ],
        }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/validate', manifest);

    expect(res.status).toBe(422);
    expect(res.body.valid).toBe(false);
  });

  it('should return 422 for duplicate domains', async () => {
    const domain = faker.internet.domainName();

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ name: 'n1' })],
      http: [
        makeHttpResourceManifest({
          name: 'a1',
          domain,
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 3000 }),
          ],
        }),
        makeHttpResourceManifest({
          name: 'a2',
          domain,
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 8080 }),
          ],
        }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/validate', manifest);

    expect(res.status).toBe(422);
    expect(
      res.body.errors.some((e: any) => e.code === 'DUPLICATE_DOMAIN'),
    ).toBe(true);
  });

  it('should return 422 when require_auth without providerRef', async () => {
    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ name: 'n1' })],
      http: [
        makeHttpResourceManifest({
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 3000 }),
          ],
          accessRules: [
            makeAccessRuleManifest({
              action: { type: 'access.require_auth' },
            }),
          ],
        }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/validate', manifest);

    expect(res.status).toBe(422);
    expect(
      res.body.errors.some((e: any) => e.code === 'MISSING_PROVIDER'),
    ).toBe(true);
  });

  it('should return warnings without failing validation', async () => {
    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ name: 'n1' })],
      http: [
        makeHttpResourceManifest({
          domain: 'this-domain-definitely-does-not-resolve.invalid',
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 3000 }),
          ],
        }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/validate', manifest);

    // Should still be valid (warnings don't block)
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.warnings.length).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/iac/plan
// ═══════════════════════════════════════════════════════════════════

describe('POST /api/iac/plan', () => {
  it('should return plan with create actions for new resources', async () => {
    const manifest = makeFullStackManifest();

    const res = await sendYaml('post', '/api/iac/plan', manifest);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('plan');
    expect(res.body.changed).toBe(true);

    const nodePhase = res.body.phases.find((p: any) => p.phaseId === 'node');
    expect(nodePhase.entities[0].action).toBe('create');
  });

  it('should not persist anything to the database', async () => {
    const nodeName = faker.string.alphanumeric(12);
    const manifest = makeFullStackManifest({ nodeName: nodeName });

    const res = await sendYaml('post', '/api/iac/plan', manifest);

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(true);

    // Verify nothing was written
    const checkRes = await request.get('/api/nodes').set('Cookie', cookie!);

    const nodeInDb = checkRes.body.data?.find((n: any) => n.name === nodeName);
    expect(nodeInDb).toBeUndefined();
  });

  it('should return validation errors instead of plan', async () => {
    const manifest = makeStackManifest({
      nodes: [
        makeNodeManifest({ name: 'dup' }),
        makeNodeManifest({ name: 'dup' }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/plan', manifest);

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(false);
    expect(res.body.validation.errors.length).toBeGreaterThan(0);
    expect(res.body.phases).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/iac/apply
// ═══════════════════════════════════════════════════════════════════

describe('POST /api/iac/apply', () => {
  it('should create all resources and return changed: true', async () => {
    const manifest = makeFullStackManifest();

    const res = await sendYaml('post', '/api/iac/apply', manifest);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('apply');
    expect(res.body.changed).toBe(true);
    expect(res.body.errors).toHaveLength(0);

    // All phases should have created entities
    for (const phase of res.body.phases) {
      expect(phase.errors).toHaveLength(0);
      for (const entity of phase.entities) {
        expect(entity.action).toBe('create');
      }
    }
  });

  it('should be idempotent — second apply returns changed: false', async () => {
    const manifest = makeFullStackManifest();

    const first = await sendYaml('post', '/api/iac/apply', manifest);
    expect(first.status).toBe(200);
    expect(first.body.changed).toBe(true);

    const second = await sendYaml('post', '/api/iac/apply', manifest);
    expect(second.status).toBe(200);
    expect(second.body.changed).toBe(false);

    for (const phase of second.body.phases) {
      for (const entity of phase.entities) {
        expect(entity.action).toBe('unchanged');
      }
    }
  });

  it('should detect and apply updates', async () => {
    const manifest = makeFullStackManifest();

    await sendYaml('post', '/api/iac/apply', manifest);

    // Change port
    manifest.http[0].upstreams[0].targetPort = 9999;

    const res = await sendYaml('post', '/api/iac/apply', manifest);

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(true);

    const httpPhase = res.body.phases.find((p: any) => p.phaseId === 'http');
    expect(httpPhase.entities[0].children.upstreams.updated).toBe(1);
  });

  it('should accept JSON content type', async () => {
    const manifest = makeFullStackManifest();

    const res = await sendJson('post', '/api/iac/apply', manifest);

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(true);
  });

  it('should return validation errors without applying', async () => {
    const manifest = makeStackManifest({
      http: [
        makeHttpResourceManifest({
          upstreams: [
            makeUpstreamManifest({
              targetNodeRef: 'nonexistent',
              targetPort: 3000,
            }),
          ],
        }),
      ],
    });

    const res = await sendYaml('post', '/api/iac/apply', manifest);

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(false);
    expect(res.body.validation.errors.length).toBeGreaterThan(0);
  });

  it('should handle empty manifest gracefully', async () => {
    const manifest = makeStackManifest();

    const res = await sendYaml('post', '/api/iac/apply', manifest);

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(false);
  });

  it('should create complex resource with all sub-entities', async () => {
    const nodeName = faker.string.alphanumeric(10);
    const providerName = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);
    const domain = `${httpExtId}.${faker.internet.domainName()}`;

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ name: nodeName })],
      auth: {
        providers: [makeProviderManifest({ name: providerName })],
      },
      http: [
        makeHttpResourceManifest({
          name: httpExtId,
          domain,
          providerRef: providerName,
          upstreams: [
            makeUpstreamManifest({
              pathPattern: '/',
              targetNodeRef: nodeName,
              targetPort: 3000,
            }),
            makeUpstreamManifest({
              pathPattern: '/api/',
              targetNodeRef: nodeName,
              targetPort: 8080,
            }),
          ],
          accessRules: [
            makeAccessRuleManifest({
              order: 1000,
              when: { type: 'prefix', pathPattern: '/' },
              action: { type: 'access.public' },
            }),
            makeAccessRuleManifest({
              order: 100,
              when: {
                type: 'prefix',
                pathPattern: '/api/',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
              },
              action: {
                type: 'access.require_auth',
                params: { onUnauthenticated: 'redirect' },
              },
              predicate: {
                v: 1,
                leaf: {
                  op: 'in',
                  left: { var: 'user.email' },
                  right: ['admin@example.com'],
                },
              },
            }),
          ],
          edgeRules: [
            makeEdgeRuleManifest({
              order: 10,
              when: { type: 'prefix', pathPattern: '/api/' },
              action: {
                type: 'rate_limit.req',
                params: {
                  zone: 'api_limit',
                  rate: '10r/s',
                  burst: 20,
                  nodelay: true,
                  status: 429,
                },
              },
            }),
          ],
        }),
      ],
    });

    const validateRes = await sendYaml('post', '/api/iac/validate', manifest);

    expect(validateRes.status).toBe(200);
    expect(validateRes.body.valid).toBe(true);
    expect(validateRes.body.errors).toHaveLength(0);

    const res = await sendYaml('post', '/api/iac/apply', manifest);

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(0);

    const httpPhase = res.body.phases.find((p: any) => p.phaseId === 'http');
    expect(httpPhase.entities[0].action).toBe('create');
    expect(httpPhase.entities[0].children.upstreams.created).toBe(2);
    expect(httpPhase.entities[0].children.accessRules.created).toBe(2);
    expect(httpPhase.entities[0].children.edgeRules.created).toBe(1);
  });
});
