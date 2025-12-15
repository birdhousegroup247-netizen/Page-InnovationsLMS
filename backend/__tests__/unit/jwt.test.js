/**
 * Unit Tests for JWT Utility
 */

const JWT = require('../../utils/jwt');

describe('JWT Utility', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    role: 'student',
  };

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = JWT.generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const { accessToken } = JWT.generateTokens(mockUser);
      const decoded = JWT.verifyAccessToken(accessToken);

      expect(decoded).toHaveProperty('id', mockUser.id);
      expect(decoded).toHaveProperty('email', mockUser.email);
      expect(decoded).toHaveProperty('role', mockUser.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWT.verifyAccessToken('invalid-token');
      }).toThrow();
    });
  });

  describe('extractFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;
      const extracted = JWT.extractFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(JWT.extractFromHeader('invalid')).toBeNull();
      expect(JWT.extractFromHeader('')).toBeNull();
      expect(JWT.extractFromHeader(null)).toBeNull();
    });
  });
});
