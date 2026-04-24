const Sequelize = require('sequelize');

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        statement_timeout: 30000
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      retry: {
        max: 3,
        timeout: 5000
      },
      logging: process.env.NODE_ENV !== 'production' ? console.log : false
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite'
    });

module.exports = sequelize;