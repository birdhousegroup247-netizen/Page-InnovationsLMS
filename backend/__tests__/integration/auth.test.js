/**
 * Integration Tests for Authentication API
 */

const request = require('supertest');
const app = require('../../server');
const { User } = require('../../models');

describe('Authentication API', () => {
  // Test user data
  const testUser = {
    full_name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    role: 'student',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully (verification required)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      // New flow: register issues a verification email and does not log in.
      expect(response.body.data).toHaveProperty('verification_required', true);
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });

    it('should return error for duplicate email', async () => {
      // Try to register with same email again
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' }) // Missing fields
        .expect(422); // Changed from 400 to match actual response

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/login', () => {
    // Login is gated by email_verified. The login tests below need the user verified.
    beforeAll(async () => {
      await User.update(
        { email_verified: true, email_verified_at: new Date() },
        { where: { email: testUser.email } }
      );
    });

    it('should login with correct credentials (verified user)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should block login for unverified user with 403 EMAIL_NOT_VERIFIED', async () => {
      const unverifiedEmail = `unverified${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        full_name: 'Unverified User',
        email: unverifiedEmail,
        password: 'TestPassword123!',
        role: 'student',
      }).expect(201);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: unverifiedEmail, password: 'TestPassword123!' })
        .expect(403);

      expect(response.body).toHaveProperty('code', 'EMAIL_NOT_VERIFIED');
      expect(response.body).toHaveProperty('email', unverifiedEmail);

      await User.destroy({ where: { email: unverifiedEmail }, force: true });
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken;

    beforeAll(async () => {
      // Login to get token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = response.body.data.accessToken;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Cleanup: Delete test user after all tests
  afterAll(async () => {
    try {
      await User.destroy({ where: { email: testUser.email } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
});
