import Container from 'typedi';
import { loadApp } from '../../main';
import { DataSource } from 'typeorm';

import { StackReconciler } from '../../core/reconciler/stack-reconciler';

import { NodeRepository } from '../../repositories/node-repository';
import { OidcProviderRepository } from '../../repositories/oidc-provider-repository';
import { HttpResourceRepository } from '../../repositories/http-resource-repository';
import { HttpUpstreamRepository } from '../../repositories/http-upstream-repository';
import { HttpAccessRuleRepository } from '../../repositories/http-access-rule-repository';
import { HttpEdgeRuleRepository } from '../../repositories/http-edge-rule-repository';

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

import { faker } from '@faker-js/faker';
import { StackIaCService } from '../../services/stack-iac-service';
import { NodesService } from '../../services/nodes-service';
import { HttpResourceService } from '../../services/http-resources';

let app: any;
let dataSource: DataSource;
let reconciler: StackReconciler;

let nodeRepository: NodeRepository;
let providerRepository: OidcProviderRepository;
let httpResourceRepository: HttpResourceRepository;
let httpUpstreamRepository: HttpUpstreamRepository;
let httpAccessRuleRepository: HttpAccessRuleRepository;
let httpEdgeRuleRepository: HttpEdgeRuleRepository;
let service: StackIaCService;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get<DataSource>('dataSource');
  reconciler = Container.get<StackReconciler>('reconciler');
});

beforeEach(async () => {
  nodeRepository = new NodeRepository(dataSource);
  providerRepository = new OidcProviderRepository(dataSource);
  httpResourceRepository = new HttpResourceRepository(dataSource);
  httpUpstreamRepository = new HttpUpstreamRepository(dataSource);
  httpAccessRuleRepository = new HttpAccessRuleRepository(dataSource);
  httpEdgeRuleRepository = new HttpEdgeRuleRepository(dataSource);
  service = new StackIaCService(
    providerRepository,
    nodeRepository,
    httpResourceRepository,
    Container.get(NodesService),
    Container.get(HttpResourceService),
  );
});

afterEach(async () => {
  jest.clearAllMocks();
  void app;
});

afterAll(async () => {});

describe('Stack Reconciler - Export', () => {
  it('should include resources created via apply', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);

    await reconciler.reconcile(
      makeStackManifest({
        nodes: [makeNodeManifest({ externalId: nodeExtId })],
        http: [
          makeHttpResourceManifest({
            externalId: httpExtId,
            upstreams: [
              makeUpstreamManifest({
                targetNodeRef: nodeExtId,
                targetPort: 3000,
              }),
            ],
          }),
        ],
      }),
      'apply',
    );

    const result = await service.export();

    const node = result.nodes?.find((n: any) => n.externalId === nodeExtId);
    expect(node).toBeDefined();

    const http = result.http?.find((h: any) => h.externalId === httpExtId);
    expect(http).toBeDefined();
    expect(http?.upstreams[0].targetNodeRef).toBe(nodeExtId);
  });

  it('should not expose provider secrets', async () => {
    const providerExtId = faker.string.alphanumeric(10);

    await reconciler.reconcile(
      makeStackManifest({
        auth: {
          providers: [makeProviderManifest({ externalId: providerExtId })],
        },
      }),
      'apply',
    );

    const result = await service.export();

    const provider = result.auth?.providers?.find(
      (p: any) => p.externalId === providerExtId,
    );
    expect(provider?.clientId).toBe('**REDACTED**');
    expect(provider?.clientSecret).toBe('**REDACTED**');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Validate
// ═══════════════════════════════════════════════════════════════════

describe('Stack Reconciler - Validate', () => {
  it('should pass validation for a valid manifest', async () => {
    const manifest = makeFullStackManifest();

    const result = await reconciler.validate(manifest);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail on duplicate node externalIds', async () => {
    const manifest = makeStackManifest({
      nodes: [
        makeNodeManifest({ externalId: 'same-id' }),
        makeNodeManifest({ externalId: 'same-id' }),
      ],
    });

    const result = await reconciler.validate(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_EXTERNAL_ID')).toBe(
      true,
    );
  });

  it('should fail on unresolved providerRef', async () => {
    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: 'n1' })],
      http: [
        makeHttpResourceManifest({
          providerRef: 'nonexistent-provider',
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 3000 }),
          ],
        }),
      ],
    });

    const result = await reconciler.validate(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNRESOLVED_REF')).toBe(true);
  });

  it('should fail on unresolved targetNodeRef', async () => {
    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: 'n1' })],
      http: [
        makeHttpResourceManifest({
          upstreams: [
            makeUpstreamManifest({
              targetNodeRef: 'ghost-node',
              targetPort: 3000,
            }),
          ],
        }),
      ],
    });

    const result = await reconciler.validate(manifest);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === 'UNRESOLVED_REF' && e.message.includes('ghost-node'),
      ),
    ).toBe(true);
  });

  it('should fail when require_auth rule exists without providerRef', async () => {
    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: 'n1' })],
      http: [
        makeHttpResourceManifest({
          // no providerRef
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

    const result = await reconciler.validate(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_PROVIDER')).toBe(true);
  });

  it('should fail on duplicate domains', async () => {
    const domain = faker.internet.domainName();

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: 'n1' })],
      http: [
        makeHttpResourceManifest({
          externalId: 'app1',
          domain,
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 3000 }),
          ],
        }),
        makeHttpResourceManifest({
          externalId: 'app2',
          domain,
          upstreams: [
            makeUpstreamManifest({ targetNodeRef: 'n1', targetPort: 8080 }),
          ],
        }),
      ],
    });

    const result = await reconciler.validate(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_DOMAIN')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Plan
// ═══════════════════════════════════════════════════════════════════

describe('Stack Reconciler - Plan', () => {
  it('should plan creation of all resources', async () => {
    const manifest = makeFullStackManifest();

    const result = await reconciler.reconcile(manifest, 'plan');

    expect(result.changed).toBe(true);

    const nodePhase = result.phases.find((p) => p.phaseId === 'node');
    const providerPhase = result.phases.find((p) => p.phaseId === 'provider');
    const httpPhase = result.phases.find((p) => p.phaseId === 'http');

    expect(nodePhase!.entities[0].action).toBe('create');
    expect(providerPhase!.entities[0].action).toBe('create');
    expect(httpPhase!.entities[0].action).toBe('create');
  });

  it('should not write anything to the database', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const manifest = makeFullStackManifest({ nodeExternalId: nodeExtId });

    await reconciler.reconcile(manifest, 'plan');

    const nodes = await nodeRepository.findBy({ externalId: nodeExtId });
    expect(nodes).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Apply — Create
// ═══════════════════════════════════════════════════════════════════

describe('Stack Reconciler - Apply (Create)', () => {
  it('should create nodes, providers, and http resources', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const providerExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);
    const domain = `${httpExtId}.${faker.internet.domainName()}`;

    const manifest = makeFullStackManifest({
      nodeExternalId: nodeExtId,
      providerExternalId: providerExtId,
      httpExternalId: httpExtId,
      domain,
    });

    const result = await reconciler.reconcile(manifest, 'apply');

    expect(result.changed).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Verify node in DB
    const nodes = await nodeRepository.findBy({
      externalId: nodeExtId,
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe(manifest.nodes[0].name);

    // Verify provider in DB
    const providers = await providerRepository.findBy({
      externalId: providerExtId,
    });
    expect(providers).toHaveLength(1);

    // Verify HTTP resource in DB
    const resources = await httpResourceRepository.findBy({
      externalId: httpExtId,
    });
    expect(resources).toHaveLength(1);
    expect(resources[0].domain).toBe(domain);

    // Verify upstreams
    const upstreams = await httpUpstreamRepository.find({
      where: { httpResourceId: resources[0].id },
    });
    expect(upstreams).toHaveLength(1);
    expect(upstreams[0].targetPort).toBe(3000);
    expect(upstreams[0].targetNodeId).toBe(nodes[0].id);

    // Verify access rules
    const accessRules = await httpAccessRuleRepository.find({
      where: { httpResourceId: resources[0].id },
    });
    expect(accessRules).toHaveLength(1);
  });

  it('should create http resource with multiple upstreams', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: nodeExtId })],
      http: [
        makeHttpResourceManifest({
          externalId: httpExtId,
          upstreams: [
            makeUpstreamManifest({
              pathPattern: '/',
              targetNodeRef: nodeExtId,
              targetPort: 3000,
            }),
            makeUpstreamManifest({
              pathPattern: '/api/',
              targetNodeRef: nodeExtId,
              targetPort: 8080,
            }),
            makeUpstreamManifest({
              type: 'exact',
              pathPattern: '/healthz',
              targetNodeRef: nodeExtId,
              targetPort: 8080,
            }),
          ],
        }),
      ],
    });

    const result = await reconciler.reconcile(manifest, 'apply');

    expect(result.errors).toHaveLength(0);

    const resources = await httpResourceRepository.findBy({
      externalId: httpExtId,
    });
    const upstreams = await httpUpstreamRepository.find({
      where: { httpResourceId: resources[0].id },
    });

    expect(upstreams).toHaveLength(3);
    expect(upstreams.map((u) => u.pathPattern).sort()).toEqual(
      ['/', '/api/', '/healthz'].sort(),
    );
  });

  it('should create http resource with edge rules', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);
    const cidr = faker.internet.ipv4() + '/24';

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: nodeExtId })],
      http: [
        makeHttpResourceManifest({
          externalId: httpExtId,
          upstreams: [
            makeUpstreamManifest({
              targetNodeRef: nodeExtId,
              targetPort: 3000,
            }),
          ],
          edgeRules: [
            makeEdgeRuleManifest({
              order: 10,
              when: { type: 'prefix', pathPattern: '/api/' },
              action: { type: 'ip.deny', params: { cidrs: [cidr] } },
            }),
            makeEdgeRuleManifest({
              order: 20,
              when: { type: 'prefix', pathPattern: '/api/' },
              action: {
                type: 'rate_limit.req',
                params: {
                  zone: 'api',
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

    const result = await reconciler.reconcile(manifest, 'apply');

    expect(result.errors).toHaveLength(0);

    const resources = await httpResourceRepository.findBy({
      externalId: httpExtId,
    });
    const edgeRules = await httpEdgeRuleRepository.find({
      where: { httpResourceId: resources[0].id },
    });

    expect(edgeRules).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Apply — Idempotency
// ═══════════════════════════════════════════════════════════════════

describe('Stack Reconciler - Apply (Idempotency)', () => {
  it('should return unchanged on second apply with same manifest', async () => {
    const manifest = makeFullStackManifest();

    const first = await reconciler.reconcile(manifest, 'apply');
    expect(first.changed).toBe(true);

    jest.clearAllMocks();

    const second = await reconciler.reconcile(manifest, 'apply');
    expect(second.changed).toBe(false);

    for (const phase of second.phases) {
      for (const entity of phase.entities) {
        expect(entity.action).toBe('unchanged');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Apply — Update
// ═══════════════════════════════════════════════════════════════════

describe('Stack Reconciler - Apply (Update)', () => {
  it('should detect and apply upstream changes', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: nodeExtId })],
      http: [
        makeHttpResourceManifest({
          externalId: httpExtId,
          upstreams: [
            makeUpstreamManifest({
              pathPattern: '/',
              targetNodeRef: nodeExtId,
              targetPort: 3000,
            }),
          ],
        }),
      ],
    });

    await reconciler.reconcile(manifest, 'apply');

    // Change port
    manifest.http[0].upstreams[0].targetPort = 4000;

    const result = await reconciler.reconcile(manifest, 'apply');

    expect(result.changed).toBe(true);

    const httpPhase = result.phases.find((p) => p.phaseId === 'http');
    expect(httpPhase!.entities[0].children?.upstreams.updated).toBe(1);

    // Verify in DB
    const resources = await httpResourceRepository.findBy({
      externalId: httpExtId,
    });
    const upstreams = await httpUpstreamRepository.find({
      where: { httpResourceId: resources[0].id },
    });
    expect(upstreams[0].targetPort).toBe(4000);
  });

  it('should add new upstreams and keep existing', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: nodeExtId })],
      http: [
        makeHttpResourceManifest({
          externalId: httpExtId,
          upstreams: [
            makeUpstreamManifest({
              pathPattern: '/',
              targetNodeRef: nodeExtId,
              targetPort: 3000,
            }),
          ],
        }),
      ],
    });

    await reconciler.reconcile(manifest, 'apply');

    // Add a second upstream
    manifest.http[0].upstreams.push(
      makeUpstreamManifest({
        pathPattern: '/api/',
        targetNodeRef: nodeExtId,
        targetPort: 8080,
      }),
    );

    const result = await reconciler.reconcile(manifest, 'apply');

    console.log(JSON.stringify(result, null, 2));

    const httpPhase = result.phases.find((p) => p.phaseId === 'http');
    expect(httpPhase!.entities[0].children?.upstreams.created).toBe(1);
    expect(httpPhase!.entities[0].children?.upstreams.unchanged).toBe(1);

    const resources = await httpResourceRepository.findBy({
      externalId: httpExtId,
    });
    const upstreams = await httpUpstreamRepository.find({
      where: { httpResourceId: resources[0].id },
    });
    expect(upstreams).toHaveLength(2);
  });

  it('should remove upstreams not in manifest', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: nodeExtId })],
      http: [
        makeHttpResourceManifest({
          externalId: httpExtId,
          upstreams: [
            makeUpstreamManifest({
              pathPattern: '/',
              targetNodeRef: nodeExtId,
              targetPort: 3000,
            }),
            makeUpstreamManifest({
              pathPattern: '/api/',
              targetNodeRef: nodeExtId,
              targetPort: 8080,
            }),
          ],
        }),
      ],
    });

    await reconciler.reconcile(manifest, 'apply');

    // Remove the api upstream
    manifest.http[0].upstreams = [manifest.http[0].upstreams[0]];

    const result = await reconciler.reconcile(manifest, 'apply');

    const httpPhase = result.phases.find((p) => p.phaseId === 'http');
    expect(httpPhase!.entities[0].children?.upstreams.deleted).toBe(1);
    expect(httpPhase!.entities[0].children?.upstreams.unchanged).toBe(1);

    const resources = await httpResourceRepository.findBy({
      externalId: httpExtId,
    });
    const upstreams = await httpUpstreamRepository.find({
      where: { httpResourceId: resources[0].id },
    });
    expect(upstreams).toHaveLength(1);
    expect(upstreams[0].pathPattern).toBe('/');
  });

  it('should update access rule predicate', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const providerExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: nodeExtId })],
      auth: {
        providers: [makeProviderManifest({ externalId: providerExtId })],
      },
      http: [
        makeHttpResourceManifest({
          externalId: httpExtId,
          providerRef: providerExtId,
          upstreams: [
            makeUpstreamManifest({
              targetNodeRef: nodeExtId,
              targetPort: 3000,
            }),
          ],
          accessRules: [
            makeAccessRuleManifest({
              order: 100,
              when: { type: 'prefix', pathPattern: '/api/' },
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
        }),
      ],
    });

    await reconciler.reconcile(manifest, 'apply');

    // Add another email to predicate
    manifest.http[0].accessRules[0].predicate = {
      v: 1,
      leaf: {
        op: 'in',
        left: { var: 'user.email' },
        right: ['admin@example.com', 'dev@example.com'],
      },
    };

    const result = await reconciler.reconcile(manifest, 'apply');

    const httpPhase = result.phases.find((p) => p.phaseId === 'http');
    expect(httpPhase!.entities[0].children?.accessRules.updated).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Apply — Transaction Atomicity
// ═══════════════════════════════════════════════════════════════════

describe('Stack Reconciler - Transaction Atomicity', () => {
  it('should not persist nodes if http resource creation fails', async () => {
    const nodeExtId = faker.string.alphanumeric(10);
    const httpExtId = faker.string.alphanumeric(10);

    const manifest = makeStackManifest({
      nodes: [makeNodeManifest({ externalId: nodeExtId })],
      http: [
        makeHttpResourceManifest({
          externalId: httpExtId,
          providerRef: 'nonexistent-in-db', // will fail at ref resolution
          upstreams: [
            makeUpstreamManifest({
              targetNodeRef: nodeExtId,
              targetPort: 3000,
            }),
          ],
        }),
      ],
    });

    const result = await reconciler.reconcile(manifest, 'apply');

    // Should have errors
    expect(
      result.errors.length > 0 || result.validation.errors.length > 0,
    ).toBe(true);

    // Node should NOT be persisted
    const nodes = await nodeRepository.findBy({ externalId: nodeExtId });
    expect(nodes).toHaveLength(0);
  });
});
