/**
 * API integration tests for SecureFin Auth Module.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.COOKIE_SECURE = 'false';
process.env.BCRYPT_ROUNDS = '4'; // faster tests

const testDbPath = path.join(__dirname, '../prisma/test.db');

beforeAll(() => {
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  execSync('npx prisma db push --skip-generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
});

afterAll(() => {
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

const app = require('../src/app');
const prisma = require('../src/db/database');

const testUser = {
  username: 'testuser',
  email: 'customer@test.com',
  password: 'Test@12345',
};

let sessionId;
let otp;
let authCookie;

describe('SecureFin Auth Module', () => {
  beforeEach(async () => {
    await prisma.otpSession.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new customer with valid data', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('CUSTOMER');
      expect(res.body.data.passwordHash).toBeUndefined();

      const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(dbUser.passwordHash).not.toBe(testUser.password);
      const valid = await bcrypt.compare(testUser.password, dbUser.passwordHash);
      expect(valid).toBe(true);
    });

    it('rejects weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, password: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('prevents duplicate email registration with generic message', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const res = await request(app).post('/api/auth/register').send({
        ...testUser,
        username: 'otheruser',
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Registration could not be completed');
    });
  });

  describe('Login flow (2-step MFA)', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('returns generic error for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testUser.email, password: 'Wrong@12345' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('step 1 returns sessionId after valid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.otp).toBeDefined();
      sessionId = res.body.data.sessionId;
      otp = res.body.data.otp;
    });

    it('step 2 sets HttpOnly cookie and returns user', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testUser.email, password: testUser.password });

      sessionId = loginRes.body.data.sessionId;
      otp = loginRes.body.data.otp;

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ sessionId, otp });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
      authCookie = cookies;
    });
  });

  describe('GET /api/profile', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testUser.email, password: testUser.password });
      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ sessionId: loginRes.body.data.sessionId, otp: loginRes.body.data.otp });
      authCookie = verifyRes.headers['set-cookie'];
    });

    it('returns profile for authenticated user', async () => {
      const res = await request(app).get('/api/profile').set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('returns 401 without cookie', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/users (RBAC)', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const hash = await bcrypt.hash('Admin@12345', 4);
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@securefin.test',
          passwordHash: hash,
          role: 'ADMIN',
        },
      });
    });

    async function loginAs(email, password) {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: email, password });
      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ sessionId: loginRes.body.data.sessionId, otp: loginRes.body.data.otp });
      return verifyRes.headers['set-cookie'];
    }

    it('allows ADMIN to list users', async () => {
      const cookies = await loginAs('admin@securefin.test', 'Admin@12345');
      const res = await request(app).get('/api/admin/users').set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('returns 403 for CUSTOMER role', async () => {
      const cookies = await loginAs(testUser.email, testUser.password);
      const res = await request(app).get('/api/admin/users').set('Cookie', cookies);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears auth cookie', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testUser.email, password: testUser.password });
      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ sessionId: loginRes.body.data.sessionId, otp: loginRes.body.data.otp });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', verifyRes.headers['set-cookie']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
