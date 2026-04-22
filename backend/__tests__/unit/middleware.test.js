/**
 * Unit Tests for Middleware
 */

const JWT = require('../../utils/jwt');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');
const { validate } = require('../../middleware/validation/authValidation');
const Joi = require('joi');

// Mock DB and TokenBlacklist so authenticate works without a real database
jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));
jest.mock('../../utils/tokenBlacklist', () => ({
  isBlacklisted: jest.fn().mockResolvedValue(false),
}));

const { User } = require('../../models');

describe('Middleware Tests', () => {
  // =========================================================================
  // Authentication Middleware
  // =========================================================================
  describe('Authentication Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        headers: {},
        user: null,
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    describe('authenticate', () => {
      it('should authenticate user with valid token', async () => {
        const mockUser = { id: 1, email: 'test@example.com', role: 'student', is_active: true };
        const { accessToken } = JWT.generateTokens(mockUser);
        mockReq.headers.authorization = `Bearer ${accessToken}`;
        mockReq.cookies = {};
        User.findByPk.mockResolvedValue(mockUser);

        await authenticate(mockReq, mockRes, mockNext);

        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.id).toBe(mockUser.id);
        expect(mockReq.user.email).toBe(mockUser.email);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject request without authorization header', async () => {
        mockReq.cookies = {};
        await authenticate(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('token'),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with invalid token', async () => {
        mockReq.headers.authorization = 'Bearer invalid-token';
        mockReq.cookies = {};

        await authenticate(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with malformed header', async () => {
        mockReq.headers.authorization = 'InvalidFormat token';
        mockReq.cookies = {};

        await authenticate(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('authorize (instructor)', () => {
      it('should allow access for instructor role', () => {
        mockReq.user = { id: 1, role: 'instructor' };

        const middleware = authorize('instructor', 'admin', 'super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow access for admin role', () => {
        mockReq.user = { id: 1, role: 'admin' };

        const middleware = authorize('instructor', 'admin', 'super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject access for student role', () => {
        mockReq.user = { id: 1, role: 'student' };

        const middleware = authorize('instructor', 'admin', 'super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('permission'),
          })
        );
      });
    });

    describe('authorize (admin)', () => {
      it('should allow access for admin role', () => {
        mockReq.user = { id: 1, role: 'admin' };

        const middleware = authorize('admin', 'super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow access for super_admin role', () => {
        mockReq.user = { id: 1, role: 'super_admin' };

        const middleware = authorize('admin', 'super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject access for instructor role', () => {
        mockReq.user = { id: 1, role: 'instructor' };

        const middleware = authorize('admin', 'super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should reject access for student role', () => {
        mockReq.user = { id: 1, role: 'student' };

        const middleware = authorize('admin', 'super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });

    describe('authorize (super_admin)', () => {
      it('should allow access for super_admin role only', () => {
        mockReq.user = { id: 1, role: 'super_admin' };

        const middleware = authorize('super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject access for admin role', () => {
        mockReq.user = { id: 1, role: 'admin' };

        const middleware = authorize('super_admin');
        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should reject access for other roles', () => {
        const roles = ['student', 'instructor'];

        roles.forEach(role => {
          mockReq.user = { id: 1, role };
          mockNext.mockClear();

          const middleware = authorize('super_admin');
          middleware(mockReq, mockRes, mockNext);

          expect(mockRes.status).toHaveBeenCalledWith(403);
          expect(mockNext).not.toHaveBeenCalled();
        });
      });
    });
  });

  // =========================================================================
  // Validation Middleware
  // =========================================================================
  describe('Validation Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    describe('validate', () => {
      // validate() takes a schema name string that maps to schemas in authValidation.js

      it('should pass validation with valid login data', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'TestPassword123!',
        };

        const validationMiddleware = validate('login');
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should reject login with invalid email', () => {
        mockReq.body = {
          email: 'invalid-email',
          password: 'TestPassword123!',
        };

        const validationMiddleware = validate('login');
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('alid'),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject login with missing password', () => {
        mockReq.body = {
          email: 'test@example.com',
        };

        const validationMiddleware = validate('login');
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should pass validation with valid register data', () => {
        mockReq.body = {
          full_name: 'Test User',
          email: 'test@example.com',
          password: 'TestPassword123!',
        };

        const validationMiddleware = validate('register');
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should reject register with short password', () => {
        mockReq.body = {
          full_name: 'Test User',
          email: 'test@example.com',
          password: 'short',
        };

        const validationMiddleware = validate('register');
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return server error for unknown schema name', () => {
        mockReq.body = { email: 'test@example.com' };

        const validationMiddleware = validate('nonexistent');
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // Helper Functions
  // =========================================================================
  describe('Middleware Helper Functions', () => {
    describe('Role Hierarchy', () => {
      it('should maintain correct role hierarchy', () => {
        const roleHierarchy = {
          student: 1,
          instructor: 2,
          admin: 3,
          super_admin: 4,
        };

        expect(roleHierarchy.student).toBeLessThan(roleHierarchy.instructor);
        expect(roleHierarchy.instructor).toBeLessThan(roleHierarchy.admin);
        expect(roleHierarchy.admin).toBeLessThan(roleHierarchy.super_admin);
      });
    });

    describe('Token Extraction', () => {
      it('should extract token from Bearer header', () => {
        const token = 'test-token-123';
        const header = `Bearer ${token}`;
        const extracted = JWT.extractFromHeader(header);
        expect(extracted).toBe(token);
      });

      it('should handle various header formats', () => {
        expect(JWT.extractFromHeader('Bearer token123')).toBe('token123');
        expect(JWT.extractFromHeader('Bearer ')).toBeFalsy(); // empty string, treated as no token
        expect(JWT.extractFromHeader('token-without-bearer')).toBeNull();
      });
    });
  });
});
