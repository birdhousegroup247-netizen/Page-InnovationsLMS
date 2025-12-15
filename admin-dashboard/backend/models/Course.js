const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Course = sequelize.define(
  'Course',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnail: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    duration_hours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      defaultValue: 'beginner',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.0,
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    enrollment_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    completion_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'courses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['category_id'] },
      { fields: ['instructor_id'] },
      { fields: ['status'] },
      { fields: ['slug'] },
      { fields: ['difficulty'] },
    ],
  }
);

// Generate slug from title
Course.beforeValidate((course) => {
  if (course.title && !course.slug) {
    course.slug = course.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

module.exports = Course;
