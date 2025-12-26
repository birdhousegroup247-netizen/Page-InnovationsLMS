const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InstructorApplication = sequelize.define(
  'InstructorApplication',
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
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected', 'revoked'),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Application status',
    },
    // Application details
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Why the user wants to become an instructor',
    },
    qualifications: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Education, certifications, credentials',
    },
    teaching_experience: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Previous teaching experience',
    },
    subject_expertise: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'What subjects/topics they can teach',
    },
    portfolio_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Link to portfolio or sample work',
      validate: {
        isUrl: {
          msg: 'Portfolio URL must be a valid URL',
        },
      },
    },
    // Review information
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Why the application was rejected',
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes for admins',
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      comment: 'Admin who reviewed the application',
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the application was reviewed',
    },
    // Timestamps
    applied_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When application was submitted',
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
    tableName: 'instructor_applications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['reviewed_by'] },
      { fields: ['applied_at'] },
      { fields: ['reviewed_at'] },
    ],
  }
);

// Instance Methods

/**
 * Check if application is pending
 * @returns {boolean}
 */
InstructorApplication.prototype.isPending = function () {
  return this.status === 'pending';
};

/**
 * Check if application is approved
 * @returns {boolean}
 */
InstructorApplication.prototype.isApproved = function () {
  return this.status === 'approved';
};

/**
 * Check if application is rejected
 * @returns {boolean}
 */
InstructorApplication.prototype.isRejected = function () {
  return this.status === 'rejected';
};

/**
 * Mark application as under review
 * @returns {Promise<void>}
 */
InstructorApplication.prototype.markUnderReview = async function () {
  this.status = 'under_review';
  await this.save();
};

/**
 * Approve application
 * @param {number} reviewerId - Admin who approved
 * @returns {Promise<void>}
 */
InstructorApplication.prototype.approve = async function (reviewerId) {
  this.status = 'approved';
  this.reviewed_by = reviewerId;
  this.reviewed_at = new Date();
  await this.save();
};

/**
 * Reject application
 * @param {number} reviewerId - Admin who rejected
 * @param {string} reason - Reason for rejection
 * @returns {Promise<void>}
 */
InstructorApplication.prototype.reject = async function (reviewerId, reason = null) {
  this.status = 'rejected';
  this.reviewed_by = reviewerId;
  this.reviewed_at = new Date();
  if (reason) {
    this.rejection_reason = reason;
  }
  await this.save();
};

/**
 * Revoke approval
 * @param {number} reviewerId - Admin who revoked
 * @param {string} reason - Reason for revocation
 * @returns {Promise<void>}
 */
InstructorApplication.prototype.revoke = async function (reviewerId, reason = null) {
  this.status = 'revoked';
  this.reviewed_by = reviewerId;
  this.reviewed_at = new Date();
  if (reason) {
    this.rejection_reason = reason;
  }
  await this.save();
};

// Static Methods

/**
 * Find application by user ID
 * @param {number} userId
 * @returns {Promise<InstructorApplication|null>}
 */
InstructorApplication.findByUserId = async function (userId) {
  return await InstructorApplication.findOne({
    where: { user_id: userId },
    order: [['created_at', 'DESC']], // Get most recent application
  });
};

/**
 * Get all pending applications
 * @returns {Promise<InstructorApplication[]>}
 */
InstructorApplication.getPending = async function () {
  return await InstructorApplication.findAll({
    where: { status: 'pending' },
    order: [['applied_at', 'ASC']], // Oldest first
  });
};

/**
 * Get all applications with a specific status
 * @param {string} status
 * @returns {Promise<InstructorApplication[]>}
 */
InstructorApplication.getByStatus = async function (status) {
  return await InstructorApplication.findAll({
    where: { status },
    order: [['created_at', 'DESC']],
  });
};

/**
 * Create application for user
 * @param {Object} applicationData
 * @returns {Promise<InstructorApplication>}
 */
InstructorApplication.createApplication = async function (applicationData) {
  return await InstructorApplication.create({
    ...applicationData,
    applied_at: new Date(),
  });
};

module.exports = InstructorApplication;
