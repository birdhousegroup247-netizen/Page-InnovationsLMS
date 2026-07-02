/**
 * Unit Tests for PayPal Controller
 *
 * Mocks the DB, PayPal service, email, and notifications layers so these
 * tests run without any external dependencies. They cover the public REST
 * handlers (initialize, capture, installment, verify, webhook) at the
 * level of: input validation, the right downstream calls, and the shape
 * of the response.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../../models', () => {
  const mockPayment = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  };
  return {
    User: { findByPk: jest.fn(), update: jest.fn(), increment: jest.fn() },
    Course: { findByPk: jest.fn() },
    Payment: mockPayment,
    Enrollment: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
    CouponCode: { findOne: jest.fn(), increment: jest.fn() },
    CouponRedemption: { create: jest.fn() },
    CouponCodeCourse: {},
    ChatRoom: { findOne: jest.fn() },
    ChatRoomMember: { findOrCreate: jest.fn() },
    AssignedTest: { findAll: jest.fn() },
    TestAssignment: { findOrCreate: jest.fn() },
    Referral: { findOne: jest.fn() },
  };
});

jest.mock('../../services/payment/paypalService', () => ({
  createOrder: jest.fn(),
  captureOrder: jest.fn(),
  getOrder: jest.fn(),
  refundCapture: jest.fn(),
  verifyWebhookSignature: jest.fn(),
}));

// Enrollment goes through the shared helper now, not direct Enrollment.create
jest.mock('../../services/enrollment/enrollmentService', () => ({
  resolveBundleCourseIds: jest.fn().mockResolvedValue(null),
  runTransactionalSideEffects: jest.fn().mockResolvedValue(undefined),
  runPostCommitSideEffects: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../config/database', () => ({
  sequelize: { transaction: jest.fn(async (cb) => cb({})) },
}));

jest.mock('../../services/email/emailService', () => ({
  sendPaymentReceipt: jest.fn().mockResolvedValue(undefined),
  sendPaymentCongrats: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../controllers/notifications/notificationsController', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../controllers/badges/badgesController', () => ({
  checkAndAward: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

const PayPalController = require('../../controllers/payments/paypalController');
const paypalService = require('../../services/payment/paypalService');
const enrollmentSvc = require('../../services/enrollment/enrollmentService');
const { User, Course, Payment, Enrollment, ChatRoom } = require('../../models');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeReqRes({ body = {}, query = {}, userId = 7, headers = {} } = {}) {
  const req = { body, query, user: { id: userId }, headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

function makePaymentInstance(overrides = {}) {
  const instance = {
    id: 100,
    student_id: 7,
    course_id: 42,
    amount: 60,
    original_amount: 100,
    discount_amount: 0,
    payment_status: 'pending',
    payment_plan: 'full',
    payment_gateway: 'paypal',
    paypal_order_id: 'ORDER_ABC',
    paypal_capture_id: null,
    installment_remaining_amount: null,
    installment_status: 'not_applicable',
    coupon_code_id: null,
    enrollment_id: null,
    metadata: {},
    course: { id: 42, title: 'Test Course', thumbnail: null },
    update: jest.fn().mockImplementation(function (patch) {
      Object.assign(this, patch);
      return Promise.resolve(this);
    }),
    reload: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return instance;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── initializeCheckout ─────────────────────────────────────────────────────

describe('PayPalController.initializeCheckout', () => {
  it('returns 400 when course_id is missing', async () => {
    const { req, res, next } = makeReqRes({ body: {} });
    await PayPalController.initializeCheckout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(paypalService.createOrder).not.toHaveBeenCalled();
  });

  it('returns 400 when payment_plan is invalid', async () => {
    const { req, res, next } = makeReqRes({ body: { course_id: 1, payment_plan: 'weekly' } });
    await PayPalController.initializeCheckout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('forwards a NotFoundError to next when the course does not exist', async () => {
    Course.findByPk.mockResolvedValue(null);
    const { req, res, next } = makeReqRes({ body: { course_id: 999 } });
    await PayPalController.initializeCheckout(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(paypalService.createOrder).not.toHaveBeenCalled();
  });

  it('returns 400 when the course is not published', async () => {
    Course.findByPk.mockResolvedValue({ id: 1, title: 'X', price: 100, status: 'draft' });
    const { req, res, next } = makeReqRes({ body: { course_id: 1 } });
    await PayPalController.initializeCheckout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the course is free', async () => {
    Course.findByPk.mockResolvedValue({ id: 1, title: 'Free', price: 0, status: 'published' });
    const { req, res, next } = makeReqRes({ body: { course_id: 1 } });
    await PayPalController.initializeCheckout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the user is already enrolled', async () => {
    Course.findByPk.mockResolvedValue({ id: 1, title: 'X', price: 100, status: 'published' });
    Enrollment.findOne.mockResolvedValue({ id: 50 });
    const { req, res, next } = makeReqRes({ body: { course_id: 1 } });
    await PayPalController.initializeCheckout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when a completed payment already exists', async () => {
    Course.findByPk.mockResolvedValue({ id: 1, title: 'X', price: 100, status: 'published' });
    Enrollment.findOne.mockResolvedValue(null);
    Payment.findOne.mockResolvedValue({ id: 99, payment_status: 'completed' });
    const { req, res, next } = makeReqRes({ body: { course_id: 1 } });
    await PayPalController.initializeCheckout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a PayPal order and a pending Payment row (full-pay happy path)', async () => {
    Course.findByPk.mockResolvedValue({ id: 1, title: 'My Course', price: 100, status: 'published' });
    Enrollment.findOne.mockResolvedValue(null);
    Payment.findOne.mockResolvedValue(null);
    paypalService.createOrder.mockResolvedValue({ id: 'ORDER_XYZ' });
    Payment.create.mockResolvedValue({ id: 200 });

    const { req, res, next } = makeReqRes({ body: { course_id: 1 } });
    await PayPalController.initializeCheckout(req, res, next);

    expect(paypalService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100, currency: 'USD', description: expect.stringContaining('My Course') })
    );
    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 7,
        course_id: 1,
        amount: 100,
        payment_gateway: 'paypal',
        payment_status: 'pending',
        payment_plan: 'full',
        paypal_order_id: 'ORDER_XYZ',
      })
    );
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order_id: 'ORDER_XYZ', amount: 100 }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('charges 60% of price when plan=installment', async () => {
    Course.findByPk.mockResolvedValue({ id: 1, title: 'X', price: 200, status: 'published' });
    Enrollment.findOne.mockResolvedValue(null);
    Payment.findOne.mockResolvedValue(null);
    paypalService.createOrder.mockResolvedValue({ id: 'ORDER_INST' });
    Payment.create.mockResolvedValue({ id: 201 });

    const { req, res, next } = makeReqRes({ body: { course_id: 1, payment_plan: 'installment' } });
    await PayPalController.initializeCheckout(req, res, next);

    expect(paypalService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 120 }) // 60% of 200
    );
    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_plan: 'installment',
        amount: 120,
        installment_remaining_amount: 80,
        installment_status: 'pending',
      })
    );
  });
});

// ─── captureOrder ───────────────────────────────────────────────────────────

describe('PayPalController.captureOrder', () => {
  it('returns 400 when order_id is missing', async () => {
    const { req, res, next } = makeReqRes({ body: {} });
    await PayPalController.captureOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(paypalService.captureOrder).not.toHaveBeenCalled();
  });

  it('returns 404 when no Payment matches the order id', async () => {
    Payment.findOne.mockResolvedValue(null);
    Payment.findAll.mockResolvedValue([]);
    const { req, res, next } = makeReqRes({ body: { order_id: 'NOPE' } });
    await PayPalController.captureOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('is idempotent on a completed full payment (returns already_processed without re-capturing)', async () => {
    const payment = makePaymentInstance({ payment_status: 'completed' });
    Payment.findOne.mockResolvedValue(payment);
    const { req, res, next } = makeReqRes({ body: { order_id: 'ORDER_ABC' } });
    await PayPalController.captureOrder(req, res, next);
    expect(paypalService.captureOrder).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ already_processed: true }) })
    );
  });

  it('returns 400 if PayPal returns a non-COMPLETED status', async () => {
    const payment = makePaymentInstance();
    Payment.findOne.mockResolvedValue(payment);
    paypalService.captureOrder.mockResolvedValue({ status: 'DECLINED', purchase_units: [] });
    const { req, res, next } = makeReqRes({ body: { order_id: 'ORDER_ABC' } });
    await PayPalController.captureOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('captures + enrolls on the happy path', async () => {
    const payment = makePaymentInstance();
    Payment.findOne.mockResolvedValue(payment);
    paypalService.captureOrder.mockResolvedValue({
      status: 'COMPLETED',
      purchase_units: [
        { payments: { captures: [{ id: 'CAP_1', amount: { value: '60.00' } }] } },
      ],
    });
    Enrollment.create.mockResolvedValue({ id: 500 });
    User.findByPk.mockResolvedValue({ id: 7, full_name: 'Test', email: 't@example.com' });
    Course.findByPk.mockResolvedValue({ id: 42, title: 'Test Course' });
    ChatRoom.findOne.mockResolvedValue(null);

    const { req, res, next } = makeReqRes({ body: { order_id: 'ORDER_ABC' } });
    await PayPalController.captureOrder(req, res, next);

    expect(paypalService.captureOrder).toHaveBeenCalledWith('ORDER_ABC');
    expect(enrollmentSvc.runTransactionalSideEffects).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 7, courseIds: [42] })
    );
    expect(enrollmentSvc.runPostCommitSideEffects).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 7, courseIds: [42], gateway: 'paypal' })
    );
    expect(payment.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ enrolled: false /* enrollment.findByPk not stubbed */ }) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('routes installment second-payment via metadata.paypal_installment_order_id', async () => {
    const installmentPayment = makePaymentInstance({
      payment_status: 'completed',
      payment_plan: 'installment',
      installment_status: 'pending',
      installment_remaining_amount: 40,
      metadata: { paypal_installment_order_id: 'ORDER_2ND' },
    });
    Payment.findOne.mockResolvedValue(null);
    Payment.findAll.mockResolvedValue([installmentPayment]);
    paypalService.captureOrder.mockResolvedValue({
      status: 'COMPLETED',
      purchase_units: [{ payments: { captures: [{ id: 'CAP_2', amount: { value: '40.00' } }] } }],
    });

    const { req, res, next } = makeReqRes({ body: { order_id: 'ORDER_2ND' } });
    await PayPalController.captureOrder(req, res, next);

    expect(paypalService.captureOrder).toHaveBeenCalledWith('ORDER_2ND');
    // installment branch should mark status=completed, not run _enrollFromPayment
    expect(installmentPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({ installment_status: 'completed' })
    );
    expect(Enrollment.create).not.toHaveBeenCalled();
  });
});

// ─── initializeInstallmentCheckout ──────────────────────────────────────────

describe('PayPalController.initializeInstallmentCheckout', () => {
  it('returns 400 when no outstanding installment is found', async () => {
    Payment.findOne.mockResolvedValue(null);
    const { req, res, next } = makeReqRes();
    await PayPalController.initializeInstallmentCheckout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a second PayPal order and stores the id in metadata', async () => {
    const payment = makePaymentInstance({
      payment_plan: 'installment',
      payment_status: 'completed',
      installment_remaining_amount: 40,
      installment_status: 'pending',
      metadata: {},
      course: { id: 42, title: 'Course' },
    });
    Payment.findOne.mockResolvedValue(payment);
    paypalService.createOrder.mockResolvedValue({ id: 'ORDER_2ND' });

    const { req, res, next } = makeReqRes();
    await PayPalController.initializeInstallmentCheckout(req, res, next);

    expect(paypalService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 40, currency: 'USD' })
    );
    expect(payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ paypal_installment_order_id: 'ORDER_2ND' }),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order_id: 'ORDER_2ND', amount: 40 }) })
    );
  });
});

// ─── verifyPayment ──────────────────────────────────────────────────────────

describe('PayPalController.verifyPayment', () => {
  it('returns 400 when order_id is missing', async () => {
    const { req, res, next } = makeReqRes({ query: {} });
    await PayPalController.verifyPayment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when no payment matches', async () => {
    Payment.findOne.mockResolvedValue(null);
    Payment.findAll.mockResolvedValue([]);
    const { req, res, next } = makeReqRes({ query: { order_id: 'NOPE' } });
    await PayPalController.verifyPayment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the current payment status on the happy path', async () => {
    const payment = makePaymentInstance({ payment_status: 'completed', enrollment_id: 500 });
    Payment.findOne.mockResolvedValue(payment);
    Enrollment.findByPk.mockResolvedValue({ id: 500 });
    const { req, res, next } = makeReqRes({ query: { order_id: 'ORDER_ABC' } });
    await PayPalController.verifyPayment(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ payment_status: 'completed', enrolled: true }),
      })
    );
  });
});

// ─── handleWebhook ──────────────────────────────────────────────────────────

describe('PayPalController.handleWebhook', () => {
  it('returns 400 when signature verification fails', async () => {
    paypalService.verifyWebhookSignature.mockResolvedValue(false);
    const req = { headers: {}, body: Buffer.from('{}') };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await PayPalController.handleWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the raw body is not valid JSON', async () => {
    paypalService.verifyWebhookSignature.mockResolvedValue(true);
    const req = { headers: {}, body: Buffer.from('not-json{') };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await PayPalController.handleWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('acknowledges 200 even when the event_type is one we do not handle', async () => {
    paypalService.verifyWebhookSignature.mockResolvedValue(true);
    const req = {
      headers: {},
      body: Buffer.from(JSON.stringify({ event_type: 'BILLING.SUBSCRIPTION.CREATED', resource: {} })),
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await PayPalController.handleWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('acknowledges 200 and does not throw when a PAYMENT.CAPTURE.COMPLETED comes in', async () => {
    paypalService.verifyWebhookSignature.mockResolvedValue(true);
    Payment.findAll.mockResolvedValue([]);
    Payment.findOne.mockResolvedValue(null); // no matching payment — should log + return gracefully
    const req = {
      headers: {},
      body: Buffer.from(
        JSON.stringify({
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {
            id: 'CAP_X',
            amount: { value: '60.00' },
            supplementary_data: { related_ids: { order_id: 'ORDER_UNKNOWN' } },
          },
        })
      ),
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await PayPalController.handleWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
