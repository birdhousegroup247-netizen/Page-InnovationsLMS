/**
 * Unit tests for enrollmentService — the shared helper called by every
 * enrollment path (paid, admin comp, free-course).
 *
 * These tests focus on the pure-logic parts: resolveBundleCourseIds
 * behavior and payload shaping. The transactional path
 * (runTransactionalSideEffects) needs a real DB + models and is better
 * covered by an integration test.
 *
 * Written as follow-up to the VIREL comparison audit: services that
 * own money-flow logic must be independently testable.
 */

// Mock the models before requiring the service — Sequelize models
// pull the DB config from lib/database, and unit tests should not
// need a live connection.
jest.mock('../../models', () => ({
  User: { findByPk: jest.fn(), findAll: jest.fn(), update: jest.fn() },
  Course: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    increment: jest.fn(),
  },
  Payment: {},
  Enrollment: { findOrCreate: jest.fn() },
  CouponCode: {},
  CouponRedemption: { findOne: jest.fn(), create: jest.fn() },
  Bundle: { findByPk: jest.fn() },
  ChatRoom: { findOne: jest.fn() },
  ChatRoomMember: { findOrCreate: jest.fn() },
  AssignedTest: { findAll: jest.fn() },
  TestAssignment: { findOrCreate: jest.fn() },
}));
jest.mock('../../services/email/emailService', () => ({
  sendPaymentReceipt: jest.fn(),
  sendPaymentCongrats: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { resolveBundleCourseIds } = require('../../services/enrollment/enrollmentService');
const { Bundle } = require('../../models');

describe('enrollmentService.resolveBundleCourseIds', () => {
  beforeEach(() => {
    Bundle.findByPk.mockReset();
  });

  it('returns null for a falsy bundle id (no-op path for non-bundle purchases)', async () => {
    const result = await resolveBundleCourseIds(null);
    expect(result).toBeNull();
    expect(Bundle.findByPk).not.toHaveBeenCalled();
  });

  it('returns null when the bundle does not exist', async () => {
    Bundle.findByPk.mockResolvedValue(null);
    const result = await resolveBundleCourseIds(999);
    expect(result).toBeNull();
  });

  it('returns the list of course ids from a real bundle', async () => {
    Bundle.findByPk.mockResolvedValue({
      courses: [{ id: 10 }, { id: 20 }, { id: 30 }],
    });
    const result = await resolveBundleCourseIds(5);
    expect(result).toEqual([10, 20, 30]);
  });

  it('handles an empty-course bundle without throwing', async () => {
    Bundle.findByPk.mockResolvedValue({ courses: [] });
    const result = await resolveBundleCourseIds(7);
    expect(result).toEqual([]);
  });
});
