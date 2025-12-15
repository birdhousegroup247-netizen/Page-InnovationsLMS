/**
 * Article Bookmark Model
 * Students can bookmark knowledge articles
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ArticleBookmark = sequelize.define(
  'ArticleBookmark',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    article_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'knowledge_articles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'article_bookmarks',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['student_id'],
      },
      {
        fields: ['article_id'],
      },
      {
        unique: true,
        fields: ['student_id', 'article_id'],
      },
    ],
  }
);

module.exports = ArticleBookmark;
