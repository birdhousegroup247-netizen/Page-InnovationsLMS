const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    parent_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'categories',
    timestamps: false,
    indexes: [
      { fields: ['parent_category_id'] },
      { fields: ['is_active'] },
      { fields: ['display_order'] },
    ],
  }
);

// Static Methods
Category.getMainCategories = async function () {
  return await Category.findAll({
    where: { parent_category_id: null, is_active: true },
    order: [['display_order', 'ASC']],
  });
};

Category.getSubCategories = async function (parentId) {
  return await Category.findAll({
    where: { parent_category_id: parentId, is_active: true },
    order: [['display_order', 'ASC']],
  });
};

module.exports = Category;
