const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const EmailVerification = sequelize.define(
  'EmailVerification',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    verification_code: {
      type: DataTypes.STRING(6),
      allowNull: false,
      comment: '6-digit numeric code shown alongside the link',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Failed code attempts — locks after too many',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'email_verifications',
    timestamps: false,
    indexes: [
      { fields: ['verification_token'] },
      { fields: ['user_id'] },
      { fields: ['expires_at'] },
    ],
  }
);

EmailVerification.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

EmailVerification.generateCode = function () {
  // 6-digit numeric, leading zeros preserved
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
};

EmailVerification.createForUser = async function (userId) {
  // Invalidate any prior unused tokens for this user so resends supersede them
  await EmailVerification.update(
    { used: true },
    { where: { user_id: userId, used: false } }
  );
  const token = EmailVerification.generateToken();
  const code = EmailVerification.generateCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await EmailVerification.create({
    user_id: userId,
    verification_token: token,
    verification_code: code,
    expires_at: expiresAt,
  });
  return { token, code, expires_at: expiresAt };
};

EmailVerification.findActiveByToken = async function (token) {
  const record = await EmailVerification.findOne({
    where: { verification_token: token, used: false },
  });
  if (!record) return null;
  if (new Date() > new Date(record.expires_at)) return null;
  return record;
};

EmailVerification.findActiveByUserId = async function (userId) {
  const record = await EmailVerification.findOne({
    where: { user_id: userId, used: false },
    order: [['created_at', 'DESC']],
  });
  if (!record) return null;
  if (new Date() > new Date(record.expires_at)) return null;
  return record;
};

EmailVerification.markAsUsed = async function (id) {
  await EmailVerification.update({ used: true }, { where: { id } });
};

module.exports = EmailVerification;
