import supertest from 'supertest';
import { loadApp } from '../../main';
import TestAgent from 'supertest/lib/agent';
import config from '../../config';

let app;
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

describe('Nodes Management API', () => {
  describe('GET /api/nodes', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.get('/api/nodes');

      expect(res.status).toBe(401);
    });
    it('should list nodes paginated', async () => {
      await request
        .post('/api/nodes')
        .set('Cookie', cookie!)
        .send({ name: 'client' });
      const res = await request.get('/api/nodes').set('Cookie', cookie!);

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
      const res = await request
        .post('/api/nodes')
        .set('Cookie', cookie!)
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
      const createdRes = await request
        .post('/api/nodes')
        .set('Cookie', cookie!)
        .send({ name: 'clientCreated' });

      const res = await request
        .get(`/api/nodes/${createdRes.body.id}`)
        .set('Cookie', cookie!);

      expect(res.status).toBe(200);
      expect(res.body.name).toEqual('clientCreated');
    });
    it('should return 404 error if node does not exists', async () => {
      const res = await request.get(`/api/nodes/1000`).set('Cookie', cookie!);

      expect(res.status).toBe(404);
    });
  });
  describe('PATCH /api/nodes/:id', () => {
    it('should reject unauthenticated if no token provided', async () => {
      const res = await request.patch('/api/nodes/1').send({});

      expect(res.status).toBe(401);
    });
    it('should update node', async () => {
      const createdRes = await request
        .post('/api/nodes')
        .set('Cookie', cookie!)
        .send({ name: 'clientCreated' });

      const res = await request
        .patch(`/api/nodes/${createdRes.body.id}`)
        .set('Cookie', cookie!)
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
      const createdRes = await request
        .post('/api/nodes')
        .set('Cookie', cookie!)
        .send({ name: 'clientCreated' });

      const res = await request
        .delete(`/api/nodes/${createdRes.body.id}`)
        .set('Cookie', cookie!);

      expect(res.status).toBe(200);

      const deletedRes = await request
        .get(`/api/nodes/${createdRes.body.id}`)
        .set('Cookie', cookie!);

      expect(deletedRes.status).toBe(404);
    });
  });
});
