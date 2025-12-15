const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KnowledgeArticle = sequelize.define(
  'KnowledgeArticle',
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'categories', key: 'id' },
    },
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    reading_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'knowledge_articles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['category_id'] },
      { fields: ['slug'] },
      { fields: ['author_id'] },
      { fields: ['status'] },
    ],
  }
);

// Generate slug from title
KnowledgeArticle.beforeValidate((article) => {
  if (article.title && !article.slug) {
    article.slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

module.exports = KnowledgeArticle;
