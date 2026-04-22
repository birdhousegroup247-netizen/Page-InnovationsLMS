/**
 * Unit Tests for Services
 */

const JWT = require('../../utils/jwt');
const { AppError, ValidationError, NotFoundError, UnauthorizedError } = require('../../utils/errors');
const response = require('../../utils/response');

describe('Utils and Services', () => {
  // =========================================================================
  // JWT Utility (already tested but expanding)
  // =========================================================================
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

      it('should include user data in token payload', () => {
        const { accessToken } = JWT.generateTokens(mockUser);
        const decoded = JWT.verifyAccessToken(accessToken);
        expect(decoded.id).toBe(mockUser.id);
        expect(decoded.email).toBe(mockUser.email);
        expect(decoded.role).toBe(mockUser.role);
      });
    });

    describe('verifyAccessToken', () => {
      it('should verify a valid access token', () => {
        const { accessToken } = JWT.generateTokens(mockUser);
        const decoded = JWT.verifyAccessToken(accessToken);
        expect(decoded).toHaveProperty('id', mockUser.id);
        expect(decoded).toHaveProperty('email', mockUser.email);
      });

      it('should throw error for invalid token', () => {
        expect(() => {
          JWT.verifyAccessToken('invalid-token-string');
        }).toThrow();
      });

      it('should throw error for malformed token', () => {
        expect(() => {
          JWT.verifyAccessToken('malformed.token');
        }).toThrow();
      });
    });

    describe('verifyRefreshToken', () => {
      it('should verify a valid refresh token', () => {
        const { refreshToken } = JWT.generateTokens(mockUser);
        const decoded = JWT.verifyRefreshToken(refreshToken);
        expect(decoded).toHaveProperty('id', mockUser.id);
      });

      it('should throw error for invalid refresh token', () => {
        expect(() => {
          JWT.verifyRefreshToken('invalid-refresh-token');
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
        expect(JWT.extractFromHeader(undefined)).toBeNull();
      });

      it('should handle header without Bearer prefix', () => {
        expect(JWT.extractFromHeader('token-without-bearer')).toBeNull();
      });
    });

    describe('generateAccessToken', () => {
      it('should generate token with correct expiration', () => {
        const token = JWT.generateAccessToken(mockUser);
        const decoded = JWT.verifyAccessToken(token);
        expect(decoded).toHaveProperty('exp');
        expect(decoded).toHaveProperty('iat');
      });
    });
  });

  // =========================================================================
  // Error Classes
  // =========================================================================
  describe('Error Classes', () => {
    describe('AppError', () => {
      it('should create an error with correct properties', () => {
        const error = new AppError('Test error message', 500);
        expect(error.message).toBe('Test error message');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
      });

      it('should inherit from Error', () => {
        const error = new AppError('Test', 500);
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
      });

      it('should set status to fail for 4xx codes', () => {
        const error = new AppError('Bad request', 400);
        expect(error.status).toBe('fail');
      });

      it('should set status to error for 5xx codes', () => {
        const error = new AppError('Server error', 500);
        expect(error.status).toBe('error');
      });
    });

    describe('ValidationError', () => {
      it('should create a validation error with 422 status', () => {
        const error = new ValidationError('Invalid input');
        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(422);
      });

      it('should inherit from AppError', () => {
        const error = new ValidationError('Test');
        expect(error instanceof AppError).toBe(true);
      });
    });

    describe('NotFoundError', () => {
      it('should create a not found error with 404 status', () => {
        const error = new NotFoundError('Resource not found');
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
      });
    });

    describe('UnauthorizedError', () => {
      it('should create an unauthorized error with 401 status', () => {
        const error = new UnauthorizedError('Unauthorized access');
        expect(error.message).toBe('Unauthorized access');
        expect(error.statusCode).toBe(401);
      });
    });
  });

  // =========================================================================
  // Response Utility
  // =========================================================================
  describe('Response Utility', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    describe('success', () => {
      it('should send success response with 200 status', () => {
        response.success(mockRes, { user: 'test' }, 'Success message');
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Success message',
          data: { user: 'test' },
        });
      });

      it('should handle success response without data', () => {
        response.success(mockRes, null, 'Success message');
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Success message',
          data: null,
        });
      });
    });

    describe('created', () => {
      it('should send created response with 201 status', () => {
        response.created(mockRes, { id: 1 }, 'Resource created');
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Resource created',
          data: { id: 1 },
        });
      });
    });

    describe('error', () => {
      it('should send error response with specified status', () => {
        response.error(mockRes, 'Error occurred', 500);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Error occurred',
        });
      });

      it('should default to 500 status if not specified', () => {
        response.error(mockRes, 'Error occurred');
        expect(mockRes.status).toHaveBeenCalledWith(500);
      });

      it('should include error details if provided', () => {
        response.error(mockRes, 'Validation failed', 422, { field: 'email', reason: 'invalid' });
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Validation failed',
          errors: { field: 'email', reason: 'invalid' },
        });
      });
    });

    describe('unauthorized', () => {
      it('should send unauthorized response with 401 status', () => {
        response.unauthorized(mockRes, 'Not authorized');
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized',
        });
      });
    });

    describe('forbidden', () => {
      it('should send forbidden response with 403 status', () => {
        response.forbidden(mockRes, 'Access denied');
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Access denied',
        });
      });
    });

    describe('notFound', () => {
      it('should send not found response with 404 status', () => {
        response.notFound(mockRes, 'Resource not found');
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Resource not found',
        });
      });
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================
  describe('Validation Logic', () => {
    describe('Email Validation', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      it('should validate correct email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'first+last@company.io',
        ];

        validEmails.forEach(email => {
          expect(emailRegex.test(email)).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'user@',
          'user @example.com',
        ];

        invalidEmails.forEach(email => {
          expect(emailRegex.test(email)).toBe(false);
        });
      });
    });

    describe('Password Strength', () => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      it('should validate strong passwords', () => {
        const strongPasswords = [
          'TestPass123!',
          'MyP@ssw0rd',
          'Secure123$',
        ];

        strongPasswords.forEach(password => {
          expect(passwordRegex.test(password)).toBe(true);
        });
      });

      it('should reject weak passwords', () => {
        const weakPasswords = [
          'short',
          'nouppercase123!',
          'NOLOWERCASE123!',
          'NoSpecialChar123',
          'NoNumbers!',
        ];

        weakPasswords.forEach(password => {
          expect(passwordRegex.test(password)).toBe(false);
        });
      });
    });
  });
});
