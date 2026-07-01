const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Full name is required' },
        len: {
          args: [2, 255],
          msg: 'Full name must be between 2 and 255 characters',
        },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        msg: 'Email already exists',
      },
      validate: {
        isEmail: { msg: 'Must be a valid email address' },
        notEmpty: { msg: 'Email is required' },
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true, // Null for Google OAuth users
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM('student', 'instructor', 'admin', 'super_admin'),
      defaultValue: 'student',
      allowNull: false,
    },
    instructor_status: {
      type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'),
      defaultValue: 'none',
      allowNull: false,
      comment: 'Status of instructor application: none=not applied, pending=awaiting approval, approved=can create courses, rejected=denied',
    },
    profile_picture: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Optional birthday — collected on register / Profile Settings.
    // Drives the daily birthday-wish notification + the in-app
    // celebration modal. Year stored only for record; the cron
    // matches by month + day so it fires every year.
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Year we last showed the birthday celebration modal for this
    // user. Lets us replay a missed birthday for up to N days
    // ("your birthday was 3 days ago, we kept the surprise"). Reset
    // implicitly when the year changes.
    birthday_celebrated_year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Public name shown in chat / leaderboards / forum. Falls back
    // to full_name when blank — no migration needed for old users.
    display_name: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    // IANA tz string (e.g. 'Africa/Lagos'). Drives due-date displays
    // and live-session start times across the app.
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    // Per-type toggles for { email, in_app }. NotificationsController
    // gates create() on the in_app flag — null/undefined defaults to
    // ON so existing users keep getting everything.
    notification_preferences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Privacy toggles (leaderboard opt-out, birthday wish from
    // classmates, profile visibility, etc.). Same default-on logic.
    privacy_settings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Admin-only knobs: default_landing path, etc. Ignored for
    // non-admin users.
    admin_preferences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Set via the /api/email/unsubscribe endpoint. When true,
    // non-transactional emails (drip, birthday, announcements, promo)
    // skip this user. Transactional emails (verification, password
    // reset, receipts, refunds, installment reminders, instructor
    // status changes) bypass this flag — those are legally / operationally
    // required and can't be opted out of.
    email_opt_out: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.is_active ? 'active' : 'inactive';
      },
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    two_factor_secret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Platform-wide chat ban — when non-null, the user cannot send any
    // message anywhere (DM or room). Set by admin from Chat Moderation.
    // Reversible by setting back to null.
    chat_suspended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    chat_suspended_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    registration_status: {
      type: DataTypes.ENUM('preview', 'active', 'suspended'),
      defaultValue: 'preview',
      allowNull: false,
      comment: 'preview=registered but not paid, active=paid, suspended=payment overdue hard lock',
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Links user back to their original lead record before registration',
    },
    referral_code: {
      type: DataTypes.STRING(12),
      allowNull: true,
      unique: true,
      comment: 'Unique referral code generated on first login/register',
    },
    referral_credits: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Accumulated referral credits (each successful referral = 1 credit)',
    },
    discord_user_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    discord_access_token: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    login_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total successful logins — used to distinguish first login (Welcome) vs returning (Welcome back)',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Enable soft delete
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at', // Soft delete timestamp
    indexes: [
      { fields: ['email'] },
      { fields: ['role'] },
      { fields: ['google_id'] },
      { fields: ['is_active'] },
      { fields: ['registration_status'] },
      { fields: ['deleted_at'] }, // Index for soft delete queries
    ],
  }
);

// Instance Methods

/**
 * Compare password with hashed password
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>}
 */
User.prototype.comparePassword = async function (password) {
  if (!this.password_hash) return false;
  return await bcrypt.compare(password, this.password_hash);
};

/**
 * Get user data without sensitive information
 * @returns {Object}
 */
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password_hash;
  delete values.discord_access_token;
  return values;
};

/**
 * Update last login timestamp
 * @returns {Promise<void>}
 */
User.prototype.updateLastLogin = async function () {
  this.last_login = new Date();
  this.login_count = (this.login_count || 0) + 1;
  await this.save();
};

// Static Methods

/**
 * Hash password before creating user
 * @param {string} password - Plain text password
 * @returns {Promise<string>}
 */
User.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

/**
 * Find user by email
 * @param {string} email
 * @returns {Promise<User|null>}
 */
User.findByEmail = async function (email) {
  return await User.findOne({ where: { email } });
};

/**
 * Find user by Google ID
 * @param {string} googleId
 * @returns {Promise<User|null>}
 */
User.findByGoogleId = async function (googleId) {
  return await User.findOne({ where: { google_id: googleId } });
};

/**
 * Create user with hashed password
 * @param {Object} userData - User data
 * @returns {Promise<User>}
 */
User.createUser = async function (userData) {
  if (userData.password) {
    userData.password_hash = await User.hashPassword(userData.password);
    delete userData.password;
  }
  return await User.create(userData);
};

// Hooks

// Hash password before creating user (if password is provided)
User.beforeCreate(async (user) => {
  if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

// Hash password before updating user (if password changed)
User.beforeUpdate(async (user) => {
  if (user.changed('password_hash') && user.password_hash) {
    if (!user.password_hash.startsWith('$2b$')) {
      user.password_hash = await User.hashPassword(user.password_hash);
    }
  }
});

module.exports = User;
