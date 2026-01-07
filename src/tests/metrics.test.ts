import { loadApp } from '../metrics';
import supertest from 'supertest';
import {
  mockGenPrivateKey,
  mockGenPublicKey,
  mockQuickUp,
  mockSaveToFile,
} from './.jest/global-mocks';

let app;
let request;

beforeAll(async () => {
  app = await loadApp();
  request = supertest(app);
});

afterAll(async () => {});

describe('metrics', () => {
  describe('API Home', () => {
    describe('GET /', () => {
      it('should response with a 200 status code', async () => {
        const response = await request.get('/').send();
        expect(response.statusCode).toBe(200);
        // expect(response.text).toContain(config.app.name);
      });
    });
  });
  describe('Get Metrics', () => {
    describe('GET /metrics', () => {
      it('should response with a 200 status code', async () => {
        const response = await request.get('/metrics').send();
        expect(response.statusCode).toBe(200);
        // expect(response.text).toContain(config.app.name);
      });
    });
  });
});
