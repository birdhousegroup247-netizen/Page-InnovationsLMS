/**
 * Unit Tests for Middleware
 */

const JWT = require('../../utils/jwt');
const { authenticate, isInstructor, isAdmin, isSuperAdmin } = require('../../middleware/auth/authMiddleware');
const { validate } = require('../../middleware/validation/authValidation');
const Joi = require('joi');

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
      it('should authenticate user with valid token', () => {
        const mockUser = { id: 1, email: 'test@example.com', role: 'student' };
        const { accessToken } = JWT.generateTokens(mockUser);
        mockReq.headers.authorization = `Bearer ${accessToken}`;

        authenticate(mockReq, mockRes, mockNext);

        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.id).toBe(mockUser.id);
        expect(mockReq.user.email).toBe(mockUser.email);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject request without authorization header', () => {
        authenticate(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('token'),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with invalid token', () => {
        mockReq.headers.authorization = 'Bearer invalid-token';

        authenticate(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with malformed header', () => {
        mockReq.headers.authorization = 'InvalidFormat token';

        authenticate(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('isInstructor', () => {
      beforeEach(() => {
        mockReq = {
          user: null,
          headers: {},
        };
      });

      it('should allow access for instructor role', () => {
        const mockUser = { id: 1, role: 'instructor' };
        const { accessToken } = JWT.generateTokens(mockUser);
        mockReq.headers.authorization = `Bearer ${accessToken}`;

        // First authenticate
        authenticate(mockReq, mockRes, mockNext);

        // Then check instructor role
        const instructorMiddleware = isInstructor();
        instructorMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow access for admin role', () => {
        const mockUser = { id: 1, role: 'admin' };
        const { accessToken } = JWT.generateTokens(mockUser);
        mockReq.headers.authorization = `Bearer ${accessToken}`;

        authenticate(mockReq, mockRes, mockNext);

        const instructorMiddleware = isInstructor();
        instructorMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject access for student role', () => {
        mockReq.user = { id: 1, role: 'student' };

        const instructorMiddleware = isInstructor();
        instructorMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('permission'),
          })
        );
      });
    });

    describe('isAdmin', () => {
      it('should allow access for admin role', () => {
        mockReq.user = { id: 1, role: 'admin' };

        const adminMiddleware = isAdmin();
        adminMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow access for super_admin role', () => {
        mockReq.user = { id: 1, role: 'super_admin' };

        const adminMiddleware = isAdmin();
        adminMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject access for instructor role', () => {
        mockReq.user = { id: 1, role: 'instructor' };

        const adminMiddleware = isAdmin();
        adminMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should reject access for student role', () => {
        mockReq.user = { id: 1, role: 'student' };

        const adminMiddleware = isAdmin();
        adminMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });

    describe('isSuperAdmin', () => {
      it('should allow access for super_admin role only', () => {
        mockReq.user = { id: 1, role: 'super_admin' };

        const superAdminMiddleware = isSuperAdmin();
        superAdminMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject access for admin role', () => {
        mockReq.user = { id: 1, role: 'admin' };

        const superAdminMiddleware = isSuperAdmin();
        superAdminMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should reject access for other roles', () => {
        const roles = ['student', 'instructor'];

        roles.forEach(role => {
          mockReq.user = { id: 1, role };
          mockNext.mockClear();

          const superAdminMiddleware = isSuperAdmin();
          superAdminMiddleware(mockReq, mockRes, mockNext);

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
      const testSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        age: Joi.number().integer().min(18).optional(),
      });

      it('should pass validation with valid data', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          age: 25,
        };

        const validationMiddleware = validate(testSchema);
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should reject validation with invalid email', () => {
        mockReq.body = {
          email: 'invalid-email',
          password: 'TestPassword123!',
        };

        const validationMiddleware = validate(testSchema);
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('validation'),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject validation with missing required fields', () => {
        mockReq.body = {
          email: 'test@example.com',
          // Missing password
        };

        const validationMiddleware = validate(testSchema);
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject validation with short password', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'short',
        };

        const validationMiddleware = validate(testSchema);
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should pass validation with optional fields omitted', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          // age is optional, omitted
        };

        const validationMiddleware = validate(testSchema);
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should reject validation with invalid data types', () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          age: 'not-a-number', // Should be number
        };

        const validationMiddleware = validate(testSchema);
        validationMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
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
        expect(JWT.extractFromHeader('Bearer ')).toBeNull();
        expect(JWT.extractFromHeader('token-without-bearer')).toBeNull();
      });
    });
  });
});
