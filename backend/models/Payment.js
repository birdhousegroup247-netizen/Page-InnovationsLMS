const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    enrollment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'enrollments', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
    },
    payment_method: {
      type: DataTypes.ENUM('card', 'paypal', 'bank_transfer'),
      defaultValue: 'card',
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    stripe_payment_intent_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    stripe_charge_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    payment_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    refund_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    refund_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ── Installment fields ────────────────────────────────────────────────────
    payment_plan: {
      type: DataTypes.ENUM('full', 'installment'),
      defaultValue: 'full',
      allowNull: false,
    },
    installment_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'e.g. 60.00 means user paid 60% upfront',
    },
    installment_remaining_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Exact dollar amount still owed',
    },
    installment_due_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date by which remaining installment must be paid (payment_date + 21 days)',
    },
    installment_status: {
      type: DataTypes.ENUM('not_applicable', 'pending', 'completed', 'overdue'),
      defaultValue: 'not_applicable',
      allowNull: false,
    },
    installment_paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ── Coupon / discount fields ──────────────────────────────────────────────
    coupon_code_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'coupon_codes', key: 'id' },
    },
    original_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Price before any coupon discount was applied',
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Total amount discounted via coupon',
    },
    // ── Stripe session ────────────────────────────────────────────────────────
    stripe_checkout_session_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    // ── Paystack ──────────────────────────────────────────────────────────────
    payment_gateway: {
      type: DataTypes.ENUM('stripe', 'paystack'),
      defaultValue: 'stripe',
      allowNull: false,
    },
    paystack_reference: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['student_id'] },
      { fields: ['course_id'] },
      { fields: ['enrollment_id'] },
      { fields: ['payment_status'] },
      { fields: ['stripe_payment_intent_id'] },
      { fields: ['stripe_checkout_session_id'] },
      { fields: ['transaction_id'] },
      { fields: ['installment_status'] },
      { fields: ['installment_due_date'] },
      { fields: ['payment_gateway'] },
      { fields: ['paystack_reference'] },
    ],
  }
);

module.exports = Payment;
