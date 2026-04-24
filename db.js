const Sequelize = require('sequelize');

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite'
    });

module.exports = sequelize;