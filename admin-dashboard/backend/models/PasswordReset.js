const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const PasswordReset = sequelize.define(
  'PasswordReset',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'password_resets',
    timestamps: false,
    indexes: [
      { fields: ['reset_token'] },
      { fields: ['expires_at'] },
    ],
  }
);

// Static Methods

/**
 * Generate a reset token
 * @returns {string}
 */
PasswordReset.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create password reset token for user
 * @param {number} userId
 * @returns {Promise<Object>} - { token, expires_at }
 */
PasswordReset.createResetToken = async function (userId) {
  const token = PasswordReset.generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await PasswordReset.create({
    user_id: userId,
    reset_token: token,
    expires_at: expiresAt,
  });

  return { token, expires_at: expiresAt };
};

/**
 * Verify reset token and get user ID
 * @param {string} token
 * @returns {Promise<number|null>} - user_id or null if invalid
 */
PasswordReset.verifyToken = async function (token) {
  const resetRecord = await PasswordReset.findOne({
    where: {
      reset_token: token,
      used: false,
    },
  });

  if (!resetRecord) return null;

  // Check if expired
  if (new Date() > new Date(resetRecord.expires_at)) {
    return null;
  }

  return resetRecord.user_id;
};

/**
 * Mark token as used
 * @param {string} token
 * @returns {Promise<boolean>}
 */
PasswordReset.markAsUsed = async function (token) {
  const result = await PasswordReset.update(
    { used: true },
    { where: { reset_token: token } }
  );
  return result[0] > 0;
};

/**
 * Delete expired tokens (cleanup)
 * @returns {Promise<number>} - Number of deleted records
 */
PasswordReset.deleteExpired = async function () {
  const result = await PasswordReset.destroy({
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date(),
      },
    },
  });
  return result;
};

module.exports = PasswordReset;
