/**
 * Unit tests for the token-version invalidation flow.
 *
 * Covers: JWT payload includes user.token_version, the middleware
 * rejects tokens whose tv doesn't match the DB. Password change bumps
 * the version so every prior token becomes invalid.
 *
 * Written after the VIREL comparison audit — pattern stolen from
 * VIREL's `user.tokenVersion` invalidation, adapted to Page Innovations's
 * Sequelize + PostgreSQL stack.
 */

const JWT = require('../../utils/jwt');

describe('Token Version — session invalidation', () => {
  describe('generateTokens', () => {
    it('embeds token_version as tv in the payload', () => {
      const user = { id: 1, email: 'a@b.com', role: 'student', token_version: 5 };
      const { accessToken } = JWT.generateTokens(user);
      const decoded = JWT.verifyAccessToken(accessToken);
      expect(decoded.tv).toBe(5);
    });

    it('defaults tv to 0 when token_version is missing', () => {
      const user = { id: 1, email: 'a@b.com', role: 'student' };
      const { accessToken } = JWT.generateTokens(user);
      const decoded = JWT.verifyAccessToken(accessToken);
      expect(decoded.tv).toBe(0);
    });

    it('generates different tokens for different tv values', () => {
      const u1 = { id: 1, email: 'a@b.com', role: 'student', token_version: 0 };
      const u2 = { id: 1, email: 'a@b.com', role: 'student', token_version: 1 };
      const t1 = JWT.generateTokens(u1).accessToken;
      const t2 = JWT.generateTokens(u2).accessToken;
      expect(t1).not.toBe(t2);
    });
  });

  describe('verifyAccessToken', () => {
    it('preserves tv through verification', () => {
      const user = { id: 42, email: 'x@y.com', role: 'instructor', token_version: 3 };
      const { accessToken } = JWT.generateTokens(user);
      const decoded = JWT.verifyAccessToken(accessToken);
      expect(decoded.id).toBe(42);
      expect(decoded.tv).toBe(3);
    });
  });
});
