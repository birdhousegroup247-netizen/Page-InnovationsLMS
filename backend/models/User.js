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
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
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
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['email'] },
      { fields: ['role'] },
      { fields: ['google_id'] },
      { fields: ['is_active'] },
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
  return values;
};

/**
 * Update last login timestamp
 * @returns {Promise<void>}
 */
User.prototype.updateLastLogin = async function () {
  this.last_login = new Date();
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
