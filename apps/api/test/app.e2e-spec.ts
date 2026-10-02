import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end smoke test. Requires a live Postgres + Redis AND the demo store
 * seed — run the seed with `SEED_DEMO=true` and a known `DEMO_OWNER_PASSWORD`
 * (CI does this). It exercises the core cross-cutting concerns: bootstrapping,
 * cookie auth, host-based tenant resolution + RLS, and route guards.
 *
 * NOTE: self-serve store registration is intentionally disabled (stores are
 * provisioned by the super admin), so this suite logs in as the seeded demo
 * store owner instead of registering a new store.
 */
describe('UtanStore API (e2e)', () => {
  let app: INestApplication;

  // Matches the demo store created by packages/db/prisma/seed.ts (SEED_DEMO=true).
  const demoSlug = 'freshmart';
  const demoHost = `${demoSlug}.utanstore.com`;
  const ownerEmail = 'owner@freshmart.com';
  const ownerPassword = process.env.DEMO_OWNER_PASSWORD ?? 'e2e-demo-owner-123';

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

  it('rejects self-serve registration (disabled — stores are created by the super admin)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        storeName: 'Should Not Work',
        industry: 'GROCERY',
        ownerName: 'Nobody',
        email: 'nobody@example.com',
        phone: '910000000000',
        password: 'irrelevant-123',
      })
      .expect(403);
  });

  it('logs the seeded store owner in and sets auth cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: ownerPassword })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('STORE_OWNER');

    const cookies = res.headers['set-cookie'];
    expect(cookies.join(';')).toContain('access_token');
  });

  it('returns the authenticated user for /auth/me (cookie auth)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({ email: ownerEmail, password: ownerPassword }).expect(201);
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.role).toBe('STORE_OWNER');
  });

  it('resolves the tenant by host and returns storefront config (RLS-scoped)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/store/config')
      .set('x-forwarded-host', demoHost)
      .expect(200);
    expect(res.body.data.store.slug).toBe(demoSlug);
    expect(res.body.data.checkout).toBeDefined();
  });

  it('rejects unauthenticated access to an admin route', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/products').expect(401);
  });
});
