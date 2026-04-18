const { DataTypes } = require('sequelize');
const db = require('../db');

const Invoice = db.define('Invoice', {
  customerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false
  }
});

module.exports = Invoice;