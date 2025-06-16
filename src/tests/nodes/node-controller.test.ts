import supertest from 'supertest';
import { loadApp } from '../../main';
import { mockAuthenticatedToken } from '../.jest/global-mocks';

let app;
let request;

beforeAll(async () => {
  app = await loadApp();
  request = supertest(app);
});

afterAll(async () => {});

describe('Nodes Management API', () => {
  describe('GET /api/nodes', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get('/api/nodes');

      expect(res.status).toBe(401);
    });
    it('should list nodes paginated', async () => {
      const token = mockAuthenticatedToken();
      await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'client' });
      const res = await request
        .get('/api/nodes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'client',
          }),
        ]),
      );
      expect(res.body.data[0]).toEqual(
        expect.not.objectContaining({
          privateKey: expect.any(String),
          preSharedKey: expect.any(String),
        }),
      );
    });
  });
  describe('POST /api/nodes', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.post('/api/nodes').send({});

      expect(res.status).toBe(401);
    });
    it('should create node', async () => {
      const token = mockAuthenticatedToken();

      const res = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'client' });

      expect(res.status).toBe(200);
      expect(res.body.name).toEqual('client');
      expect(res.body.token).toEqual(expect.any(String));
    });
  });
  describe('GET /api/nodes/:id', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get('/api/nodes/1');

      expect(res.status).toBe(401);
    });
    it('should get node by id', async () => {
      const token = mockAuthenticatedToken();
      const createdRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'clientCreated' });

      const res = await request
        .get(`/api/nodes/${createdRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toEqual('clientCreated');
    });
    it('should return 404 error if node does not exists', async () => {
      const token = mockAuthenticatedToken();
      const res = await request
        .get(`/api/nodes/1000`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
  describe('PATCH /api/nodes/:id', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.patch('/api/nodes/1').send({});

      expect(res.status).toBe(401);
    });
    it('should update node', async () => {
      const token = mockAuthenticatedToken();
      const createdRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'clientCreated' });

      const res = await request
        .patch(`/api/nodes/${createdRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'clientUpdated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toEqual('clientUpdated');
    });
  });
  describe('DELETE /api/nodes/:id', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.delete('/api/nodes/1');

      expect(res.status).toBe(401);
    });
    it('should delete node', async () => {
      const token = mockAuthenticatedToken();
      const createdRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'clientCreated' });

      const res = await request
        .delete(`/api/nodes/${createdRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const deletedRes = await request
        .get(`/api/nodes/${createdRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deletedRes.status).toBe(404);
    });
  });
  describe('GET /api/nodes/:id/pats', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get('/api/nodes/1/pats');

      expect(res.status).toBe(401);
    });
    it('should list available token for node', async () => {
      const token = mockAuthenticatedToken();
      const createdRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'clientCreated' });

      const res = await request
        .get(`/api/nodes/${createdRes.body.id}/pats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toEqual(1);
    });
  });
  describe('POST /api/nodes/:id/pats', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.post('/api/nodes/1/pats').send({ name: 'any' });

      expect(res.status).toBe(401);
    });
    it('should list available token for node', async () => {
      const token = mockAuthenticatedToken();
      const createdRes = await request
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'clientCreated' });

      const res = await request
        .post(`/api/nodes/${createdRes.body.id}/pats`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'NewToken' });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));

      const forbiddenRes = await request
        .get('/api/nodes')
        .set('Authorization', `Bearer ${res.body.token}`);

      expect(forbiddenRes.status).toEqual(403);

      const successfullRes = await request
        .get('/api/cli/node')
        .set('Authorization', `Bearer ${res.body.token}`);

      expect(successfullRes.status).toEqual(200);
      expect(successfullRes.body.name).toEqual('clientCreated');
    });
  });
});
