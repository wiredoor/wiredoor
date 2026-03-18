import supertest from 'supertest';
import { loadApp } from '../../main';
import { faker } from '@faker-js/faker';
import TestAgent from 'supertest/lib/agent';
import { NodesService } from '../../services/nodes-service';
import { NodeWithToken } from '../../schemas/node-schemas';
import Container from 'typedi';
import YAML from 'yaml';
import {
  makeHttpResourceManifest,
  makeNodeScopedManifest,
  makeUpstreamManifest,
} from '../iac-stack/stubs/stack-manifest.stub';
import { HttpResourceRepository } from '../../repositories/http-resource-repository';
import { HttpUpstreamRepository } from '../../repositories/http-upstream-repository';

let app;
let request: TestAgent;
let node: NodeWithToken;
let nodeToken: string;
let nodesService: NodesService;

function sendYamlAsNode(path: string, manifest: any, token: string) {
  return request
    .post(path)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'text/plain')
    .send(YAML.stringify(manifest));
}

beforeAll(async () => {
  app = await loadApp();
  request = supertest(app, {});

  nodesService = Container.get<NodesService>(NodesService);

  node = await nodesService.createNodeWithTokenKey({
    name: 'Test Node',
    isGateway: false,
  });

  nodeToken = node.token;
});

afterAll(async () => {});

describe('Wiredoor CLI API', () => {
  describe('GET /api/cli/node', () => {
    const endpoint = '/api/cli/node';
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get(endpoint);

      expect(res.status).toBe(401);
    });
    it('should get node info', async () => {
      const res = await request
        .get(endpoint)
        .set('Authorization', `Bearer ${nodeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toEqual(node.name);
      expect(res.body).toEqual(
        expect.not.objectContaining({
          privateKey: expect.any(String),
          preSharedKey: expect.any(String),
        }),
      );
    });
  });

  describe('GET /api/cli/config', () => {
    const endpoint = '/api/cli/config';
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get(endpoint);

      expect(res.status).toBe(401);
    });
    it('should get node config as string', async () => {
      const res = await request
        .get(endpoint)
        .set('Authorization', `Bearer ${nodeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.stringContaining(
          `PrivateKey = private_key\nAddress = ${node.address}`,
        ),
      );
    });
  });

  describe('GET /api/cli/wgconfig', () => {
    const endpoint = '/api/cli/wgconfig';
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get(endpoint);

      expect(res.status).toBe(401);
    });
    it('should get node config', async () => {
      const res = await request
        .get(endpoint)
        .set('Authorization', `Bearer ${nodeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          address: `${node.address}/32`,
          privateKey: 'private_key',
        }),
      );
    });
  });

  describe('PATCH /api/cli/node/gateway', () => {
    const endpoint = '/api/cli/node/gateway';
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request
        .patch(endpoint)
        .send({ gatewayNetwork: 'X.X.X.X/X' });

      expect(res.status).toBe(401);
    });
    it('should update gateway network if node is a gateway', async () => {
      const subnet = faker.internet.ipv4() + '/24';

      const gatewayNode = await nodesService.createNodeWithTokenKey({
        name: 'Node',
        isGateway: true,
        gatewayNetworks: [{ interface: 'eth0', subnet }],
      });

      const gatewayToken = gatewayNode.token;

      const newSubnet = faker.internet.ipv4() + '/16';

      const res = await request
        .patch(endpoint)
        .send({ gatewayNetwork: newSubnet })
        .set('Authorization', `Bearer ${gatewayToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          gatewayNetworks: [{ interface: 'eth0', subnet: newSubnet }],
        }),
      );
    });
    it('should reject if node is not a gateway', async () => {
      const gatewayNode = await nodesService.createNodeWithTokenKey({
        name: 'Test Node',
        isGateway: false,
      });

      const gatewayToken = gatewayNode.token;

      const newSubnet = faker.internet.ipv4() + '/16';

      const res = await request
        .patch(endpoint)
        .send({ gatewayNetwork: newSubnet })
        .set('Authorization', `Bearer ${gatewayToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/cli/regenerate', () => {
    const endpoint = '/api/cli/regenerate';
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.patch(endpoint);

      expect(res.status).toBe(401);
    });
    it('should regenerate node credentials', async () => {
      const newNode = await nodesService.createNodeWithTokenKey({
        name: 'Test Node',
        isGateway: false,
      });

      const newNodeToken = newNode.token;

      const res = await request
        .patch(endpoint)
        .set('Authorization', `Bearer ${newNodeToken}`);

      expect(res.status).toEqual(200);
      expect(res.body.token).toEqual(expect.any(String));

      const failedRes = await request
        .get('/api/cli/node')
        .set('Authorization', `Bearer ${newNodeToken}`);

      expect(failedRes.status).toEqual(401);

      const successfulRes = await request
        .get('/api/cli/node')
        .set('Authorization', `Bearer ${res.body.token}`);

      expect(successfulRes.status).toEqual(200);
    });
  });

  // describe('POST /api/cli/expose/http', () => {
  //   const endpoint = '/api/cli/expose/http';
  //   it('should reject unauthenticated if no token provided', async () => {
  //     const res = await request.post(endpoint).send(makeHttpServiceData());

  //     expect(res.status).toBe(401);
  //   });
  //   it('should expose http service', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const httpData = makeHttpServiceData();

  //     const res = await request
  //       .post(endpoint)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send(httpData);

  //     expect(res.status).toBe(200);
  //     expect(res.body).toEqual(
  //       expect.objectContaining({
  //         ...httpData,
  //         node: expect.objectContaining({
  //           id: newNode.id,
  //           name: newNode.name,
  //         }),
  //       }),
  //     );
  //   });
  //   it('should expose http service with ttl', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const httpData = makeHttpServiceData();

  //     const res = await request
  //       .post(endpoint)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send({ ...httpData, ttl: '1h' });

  //     expect(res.status).toBe(200);
  //     expect(res.body).toEqual(
  //       expect.objectContaining({
  //         ...httpData,
  //         expiresAt: expect.any(String),
  //         node: expect.objectContaining({
  //           id: newNode.id,
  //           name: newNode.name,
  //         }),
  //       }),
  //     );
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(
  //       new Date().getTime(),
  //     );
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThanOrEqual(
  //       new Date(new Date().getTime() + 59 * 60 * 1000).getTime(),
  //     );
  //   });
  // });

  // describe('POST /api/cli/expose/tcp', () => {
  //   const endpoint = '/api/cli/expose/tcp';
  //   it('should reject unauthenticated if no token provided', async () => {
  //     const res = await request.post(endpoint).send(makeHttpServiceData());

  //     expect(res.status).toBe(401);
  //   });
  //   it('should expose tcp service', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const tcpData = makeTcpServiceData();

  //     const res = await request
  //       .post(endpoint)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send(tcpData);

  //     expect(res.status).toBe(200);
  //     expect(res.body).toEqual(
  //       expect.objectContaining({
  //         ...tcpData,
  //         node: expect.objectContaining({
  //           id: newNode.id,
  //           name: newNode.name,
  //         }),
  //       }),
  //     );
  //   });
  //   it('should expose tcp service with ttl', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const tcpData = makeTcpServiceData();

  //     const res = await request
  //       .post(endpoint)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send({ ...tcpData, ttl: '1h' });

  //     expect(res.status).toBe(200);
  //     expect(res.body).toEqual(
  //       expect.objectContaining({
  //         ...tcpData,
  //         expiresAt: expect.any(String),
  //         node: expect.objectContaining({
  //           id: newNode.id,
  //           name: newNode.name,
  //         }),
  //       }),
  //     );
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(
  //       new Date().getTime(),
  //     );
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThanOrEqual(
  //       new Date(new Date().getTime() + 59 * 60 * 1000).getTime(),
  //     );
  //   });
  // });

  // describe('GET /api/cli/services/http', () => {
  //   const endpoint = '/api/cli/services/http';
  //   it('should reject unauthenticated if no token provided', async () => {
  //     const res = await request.get(endpoint);

  //     expect(res.status).toBe(401);
  //   });
  //   it('should list node http services', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const httpData = makeHttpServiceData();

  //     await request
  //       .post(`/api/cli/expose/http`)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send(httpData);

  //     const res = await request
  //       .get(endpoint)
  //       .set('Authorization', `Bearer ${newNodeToken}`);

  //     expect(res.status).toBe(200);
  //     expect(res.body).toEqual(
  //       expect.arrayContaining([
  //         expect.objectContaining({
  //           ...httpData,
  //         }),
  //       ]),
  //     );
  //   });
  // });

  // describe('GET /api/cli/services/tcp', () => {
  //   const endpoint = '/api/cli/services/tcp';
  //   it('should reject unauthenticated if no token provided', async () => {
  //     const res = await request.get(endpoint);

  //     expect(res.status).toBe(401);
  //   });
  //   it('should list node tcp services', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const tcpData = makeTcpServiceData();

  //     await request
  //       .post(`/api/cli/expose/tcp`)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send(tcpData);

  //     const res = await request
  //       .get(endpoint)
  //       .set('Authorization', `Bearer ${newNodeToken}`);

  //     expect(res.status).toBe(200);
  //     expect(res.body).toEqual(
  //       expect.arrayContaining([
  //         expect.objectContaining({
  //           ...tcpData,
  //         }),
  //       ]),
  //     );
  //   });
  // });

  // describe('PATCH /api/cli/services/http/:id/enable', () => {
  //   it('should reject unauthenticated if no token provided', async () => {
  //     const res = await request.patch(`/api/cli/services/http/1/enable`);

  //     expect(res.status).toBe(401);
  //   });
  //   it('should list node tcp services', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const httpData = makeHttpServiceData();

  //     const serviceRes = await request
  //       .post(`/api/cli/expose/http`)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send(httpData);

  //     const disabledRes = await request
  //       .patch(`/api/cli/services/http/${serviceRes.body.id}/disable`)
  //       .set('Authorization', `Bearer ${newNodeToken}`);

  //     expect(disabledRes.status).toEqual(200);
  //     expect(disabledRes.body.enabled).toEqual(false);

  //     const res = await request
  //       .patch(`/api/cli/services/http/${serviceRes.body.id}/enable`)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send({ ttl: '1h' });

  //     expect(res.status).toEqual(200);
  //     expect(res.body.enabled).toEqual(true);
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(
  //       new Date().getTime(),
  //     );
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThanOrEqual(
  //       new Date(new Date().getTime() + 59 * 60 * 1000).getTime(),
  //     );
  //   });
  // });

  // describe('PATCH /api/cli/services/tcp/:id/enable', () => {
  //   it('should reject unauthenticated if no token provided', async () => {
  //     const res = await request.patch(`/api/cli/services/tcp/1/enable`);

  //     expect(res.status).toBe(401);
  //   });
  //   it('should list node tcp services', async () => {
  //     const nodeRes = await request
  //       .post('/api/nodes')
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({
  //         name: 'Node',
  //         isGateway: false,
  //       });

  //     const newNode = nodeRes.body;

  //     const patRes = await request
  //       .post(`/api/nodes/${newNode.id}/pats`)
  //       .set('Authorization', `Bearer ${adminToken}`)
  //       .send({ name: 'NewToken' });

  //     const newNodeToken = patRes.body.token;

  //     const tcpData = makeTcpServiceData();

  //     const serviceRes = await request
  //       .post(`/api/cli/expose/tcp`)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send(tcpData);

  //     const disabledRes = await request
  //       .patch(`/api/cli/services/tcp/${serviceRes.body.id}/disable`)
  //       .set('Authorization', `Bearer ${newNodeToken}`);

  //     expect(disabledRes.status).toEqual(200);
  //     expect(disabledRes.body.enabled).toEqual(false);

  //     const res = await request
  //       .patch(`/api/cli/services/tcp/${serviceRes.body.id}/enable`)
  //       .set('Authorization', `Bearer ${newNodeToken}`)
  //       .send({ ttl: '1h' });

  //     expect(res.status).toEqual(200);
  //     expect(res.body.enabled).toEqual(true);
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(
  //       new Date().getTime(),
  //     );
  //     expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThanOrEqual(
  //       new Date(new Date().getTime() + 59 * 60 * 1000).getTime(),
  //     );
  //   });
  // });

  describe('GET /api/cli/iac/export', () => {
    const endpoint = '/api/cli/iac/export';
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get(endpoint);

      expect(res.status).toBe(401);
    });
    it('should export only resources belonging to the authenticated node', async () => {
      const node1 = await nodesService.createNodeWithTokenKey({
        name: 'Node1',
      });
      const node2 = await nodesService.createNodeWithTokenKey({
        name: 'Node2',
      });

      const ext1 = faker.string.alphanumeric(10);
      const ext2 = faker.string.alphanumeric(10);

      // Node 1 creates a resource
      await sendYamlAsNode(
        '/api/cli/iac/apply',
        makeNodeScopedManifest({
          http: [
            makeHttpResourceManifest({
              externalId: ext1,
              upstreams: [makeUpstreamManifest({ targetPort: 3000 })],
            }),
          ],
        }),
        node1.token,
      );

      // Node 2 creates a resource
      await sendYamlAsNode(
        '/api/cli/iac/apply',
        makeNodeScopedManifest({
          http: [
            makeHttpResourceManifest({
              externalId: ext2,
              upstreams: [makeUpstreamManifest({ targetPort: 4000 })],
            }),
          ],
        }),
        node2.token,
      );

      // Node 1 exports — should only see its own resource
      const res = await request
        .get('/api/cli/iac/export?format=json')
        .set('Authorization', `Bearer ${node1.token}`);

      expect(res.status).toBe(200);
      expect(res.body.kind).toBe('NodeConfig');
      expect(res.body.http.some((h: any) => h.externalId === ext1)).toBe(true);
      expect(res.body.http.some((h: any) => h.externalId === ext2)).toBe(false);
    });
    it('should strip targetNodeRef from exported upstreams', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });

      const httpExtId = faker.string.alphanumeric(10);

      await sendYamlAsNode(
        '/api/cli/iac/apply',
        makeNodeScopedManifest({
          http: [
            makeHttpResourceManifest({
              externalId: httpExtId,
              upstreams: [makeUpstreamManifest({ targetPort: 3000 })],
            }),
          ],
        }),
        node.token,
      );

      const res = await request
        .get('/api/cli/iac/export?format=json')
        .set('Authorization', `Bearer ${node.token}`);

      expect(res.status).toBe(200);

      const http = res.body.http.find((h: any) => h.externalId === httpExtId);
      expect(http).toBeDefined();

      // targetNodeRef should be stripped (it's implicit)
      for (const upstream of http.upstreams) {
        expect(upstream.targetNodeRef).toBeUndefined();
      }
    });
    it('should return YAML by default', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });

      const res = await request
        .get('/api/cli/iac/export')
        .set('Authorization', `Bearer ${node.token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('yaml');

      const parsed = YAML.parse(res.text);
      expect(parsed.kind).toBe('NodeConfig');
    });
  });

  describe('POST /api/cli/iac/validate', () => {
    it('should validate a valid node-scoped manifest', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });
      const httpExtId = faker.string.alphanumeric(10);
      const domain = `${httpExtId}.${faker.internet.domainName()}`;

      const manifest = makeNodeScopedManifest({
        http: [
          makeHttpResourceManifest({
            externalId: httpExtId,
            domain,
            upstreams: [makeUpstreamManifest({ targetPort: 3000 })],
          }),
        ],
      });

      const res = await sendYamlAsNode(
        '/api/cli/iac/validate',
        manifest,
        node.token,
      );

      console.log(res.body);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('should fail on invalid manifest structure', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });

      const res = await sendYamlAsNode(
        '/api/cli/iac/validate',
        {
          apiVersion: 'wiredoor.io/v1alpha1',
          kind: 'NodeConfig',
          http: [{ name: '' }],
        },
        node.token,
      );

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/cli/iac/apply', () => {
    it('should create resources scoped to the authenticated node', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });
      const httpExtId = faker.string.alphanumeric(10);
      const domain = `${httpExtId}.${faker.internet.domainName()}`;

      const manifest = makeNodeScopedManifest({
        http: [
          makeHttpResourceManifest({
            externalId: httpExtId,
            domain,
            upstreams: [makeUpstreamManifest({ targetPort: 3000 })],
          }),
        ],
      });

      const res = await sendYamlAsNode(
        '/api/cli/iac/apply',
        manifest,
        node.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.changed).toBe(true);

      // Verify resource was created in DB
      const resources = await Container.get(HttpResourceRepository).findBy({
        externalId: httpExtId,
      });
      expect(resources).toHaveLength(1);
      expect(resources[0].domain).toBe(domain);

      // Verify upstream points to the authenticated node
      const upstreams = await Container.get(HttpUpstreamRepository).find({
        where: { httpResourceId: resources[0].id },
      });
      expect(upstreams).toHaveLength(1);
      expect(upstreams[0].targetNodeId).toBe(node.id);
    });

    it('should allow explicit targetHost for local containers', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
        isGateway: true, // Gateway nodes should be able to use targetHost
        gatewayNetworks: [{ interface: 'eth0', subnet: '172.16.0.0/12' }],
      });
      const httpExtId = faker.string.alphanumeric(10);

      const manifest = makeNodeScopedManifest({
        http: [
          makeHttpResourceManifest({
            externalId: httpExtId,
            upstreams: [
              makeUpstreamManifest({
                targetHost: 'my-docker-container',
                targetPort: 8080,
              }),
            ],
          }),
        ],
      });

      const res = await sendYamlAsNode(
        '/api/cli/iac/apply',
        manifest,
        node.token,
      );

      expect(res.status).toBe(200);

      const resources = await Container.get(HttpResourceRepository).findBy({
        externalId: httpExtId,
      });

      expect(resources).toHaveLength(1);

      const upstreams = await Container.get(HttpUpstreamRepository).find({
        where: { httpResourceId: resources[0].id },
      });

      // When targetHost is set, it should use that instead of the node
      expect(upstreams[0].targetHost).toBe('my-docker-container');
    });

    it('should be idempotent', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });
      const manifest = makeNodeScopedManifest({
        http: [
          makeHttpResourceManifest({
            upstreams: [makeUpstreamManifest({ targetPort: 3000 })],
          }),
        ],
      });

      const first = await sendYamlAsNode(
        '/api/cli/iac/apply',
        manifest,
        node.token,
      );
      expect(first.body.changed).toBe(true);

      const second = await sendYamlAsNode(
        '/api/cli/iac/apply',
        manifest,
        node.token,
      );
      expect(second.body.changed).toBe(false);
    });

    it('should not include node phase in response', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });
      const manifest = makeNodeScopedManifest({
        http: [
          makeHttpResourceManifest({
            upstreams: [makeUpstreamManifest({ targetPort: 3000 })],
          }),
        ],
      });

      const res = await sendYamlAsNode(
        '/api/cli/iac/apply',
        manifest,
        node.token,
      );

      expect(res.status).toBe(200);
      // Node phase should be filtered out
      const nodePhase = res.body.phases.find((p: any) => p.phaseId === 'node');
      expect(nodePhase).toBeUndefined();
    });

    it('should handle multiple upstreams', async () => {
      const node = await nodesService.createNodeWithTokenKey({
        name: 'TestNode',
      });
      const httpExtId = faker.string.alphanumeric(10);

      const manifest = makeNodeScopedManifest({
        http: [
          makeHttpResourceManifest({
            externalId: httpExtId,
            upstreams: [
              makeUpstreamManifest({
                pathPattern: '/',
                targetPort: 3000,
              }),
              makeUpstreamManifest({
                pathPattern: '/api/',
                targetPort: 8080,
              }),
              makeUpstreamManifest({
                pathPattern: '/static/',
                targetHost: 'minio',
                targetPort: 9000,
              }),
            ],
          }),
        ],
      });

      const res = await sendYamlAsNode(
        '/api/cli/iac/apply',
        manifest,
        node.token,
      );

      expect(res.status).toBe(200);

      const resources = await Container.get(HttpResourceRepository).findBy({
        externalId: httpExtId,
      });
      const upstreams = await Container.get(HttpUpstreamRepository).find({
        where: { httpResourceId: resources[0].id },
      });

      expect(upstreams).toHaveLength(3);

      // Two upstreams should point to the node
      // const nodeUpstreams = upstreams.filter((u) => u.targetNodeId === node.id);
      // expect(nodeUpstreams).toHaveLength(2);

      // One upstream should use explicit targetHost
      const hostUpstream = upstreams.find((u) => u.targetHost === 'minio');
      expect(hostUpstream).toBeDefined();
    });
  });
});
