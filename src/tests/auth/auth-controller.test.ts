import supertest from 'supertest';
import { loadApp } from '../../main';
import config from '../../config';

let app;
let request: any;

beforeAll(async () => {
  app = await loadApp();
  request = supertest.agent(app);
});

afterAll(async () => {});

describe('API Auth Endpoint', () => {
  describe('POST /api/auth', () => {
    it('should authenticate admin user', async () => {
      const authRes = await request.post('/api/auth/login').send({
        username: 'admin@example.com',
        password: 'admin',
      });

      expect(authRes.status).toBe(200);
      expect(authRes.body.token).toBeDefined();
    });
    it('should rejects unauthenticated if credentials doesn`t match', async () => {
      const authRes = await request.post('/api/auth/login').send({
        username: 'other',
        password: 'other',
      });

      expect(authRes.status).toBe(401);
    });
  });
  describe('POST /auth/web/login', () => {
    it('should authenticate user and set sid cookie', async () => {
      const res = await request.post('/api/auth/web/login').send({
        username: 'admin@example.com',
        password: 'admin',
      });

      expect(res.status).toBe(200);

      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.name).toBeDefined();
      expect(res.body.user.email).toBeDefined();

      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(Array.isArray(setCookie)).toBe(true);

      const sidCookie = (setCookie as unknown as string[]).find((c: string) =>
        c.startsWith(`${config.session.name}=`),
      );
      expect(sidCookie).toBeDefined();

      expect(sidCookie).toContain('HttpOnly');

      expect(sidCookie).toContain('SameSite=Lax');
    });

    it('should reject invalid credentials', async () => {
      const res = await request.post('/api/auth/web/login').send({
        username: 'wrong@example.com',
        password: 'wrong',
      });

      expect(res.status).toBe(401);
    });
  });
});
