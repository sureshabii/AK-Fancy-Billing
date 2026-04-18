const Sequelize = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || {
  dialect: 'sqlite',
  storage: './database.sqlite'
});

module.exports = sequelize;