import supertest from 'supertest';
import { loadApp } from '../../main';
import { mockAuthenticatedToken } from '../.jest/global-mocks';
import { Node } from '../../database/models/node';
import { makeHttpServiceData } from '../nodes/stubs/http-service.stub';
import { faker } from '@faker-js/faker';
import { makeTcpServiceData } from '../nodes/stubs/tcp-service.stub';

let app;
let request;
let node: Node;
let adminToken: string;
let nodeToken: string;

beforeAll(async () => {
  app = await loadApp();
  request = supertest(app, {});

  adminToken = mockAuthenticatedToken();

  const nodeRes = await request
    .post('/api/nodes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Node' });

  node = nodeRes.body;

  const patRes = await request
    .post(`/api/nodes/${node.id}/pats`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'NewToken' });

  nodeToken = patRes.body.token;
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
      const nodeRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Node',
          isGateway: true,
          gatewayNetwork: faker.internet.ipv4() + '/24',
        });

      const gatewayNode = nodeRes.body;

      const patRes = await request
        .post(`/api/nodes/${gatewayNode.id}/pats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'NewToken' });

      const gatewayToken = patRes.body.token;

      const newSubnet = faker.internet.ipv4() + '/16';

      const res = await request
        .patch(endpoint)
        .send({ gatewayNetwork: newSubnet })
        .set('Authorization', `Bearer ${gatewayToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          gatewayNetwork: newSubnet,
        }),
      );
    });
    it('should update gateway network if node is a gateway', async () => {
      const nodeRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Node',
          isGateway: false,
        });

      const gatewayNode = nodeRes.body;

      const patRes = await request
        .post(`/api/nodes/${gatewayNode.id}/pats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'NewToken' });

      const gatewayToken = patRes.body.token;

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
      const nodeRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Node',
          isGateway: false,
        });

      const newNode = nodeRes.body;

      const patRes = await request
        .post(`/api/nodes/${newNode.id}/pats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'NewToken' });

      const newNodeToken = patRes.body.token;

      const res = await request
        .patch(endpoint)
        .set('Authorization', `Bearer ${newNodeToken}`);

      expect(res.status).toEqual(200);
      expect(res.body.token).toEqual(expect.any(String));

      const failedRes = await request
        .get('/api/cli/node')
        .set('Authorization', `Bearer ${newNodeToken}`);

      expect(failedRes.status).toEqual(403);

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
});
