import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end smoke test. Requires a live Postgres + Redis (provided by CI).
 * Exercises the core cross-cutting concerns: bootstrapping, auth cookies,
 * tenant provisioning on register, and host-based tenant resolution + RLS.
 */
describe('UtanStore API (e2e)', () => {
  let app: INestApplication;
  const unique = Date.now().toString(36);
  const storeName = `E2E Mart ${unique}`;
  let slug: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/health returns a status', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(['ok', 'degraded']).toContain(res.body.data.status);
    expect(res.body.data.db).toBe(true);
  });

  it('registers a new store + owner and sets auth cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        storeName,
        industry: 'GROCERY',
        ownerName: 'E2E Owner',
        email: `owner-${unique}@example.com`,
        phone: '919876500000',
        password: 'e2e-password-123',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBeDefined();
    slug = res.body.data.slug;

    const cookies = res.headers['set-cookie'];
    expect(cookies.join(';')).toContain('access_token');
  });

  it('returns the authenticated user for /auth/me (cookie auth)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({ email: `owner-${unique}@example.com`, password: 'e2e-password-123' }).expect(201);
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.role).toBe('STORE_OWNER');
  });

  it('resolves the tenant by host and returns storefront config (RLS-scoped)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/store/config')
      .set('x-forwarded-host', `${slug}.utanstore.com`)
      .expect(200);
    expect(res.body.data.store.slug).toBe(slug);
    expect(res.body.data.checkout).toBeDefined();
  });

  it('rejects unauthenticated access to an admin route', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/products').expect(401);
  });
});
