const dns = require('dns');
const Sequelize = require('sequelize');

// Force IPv4 resolution first for environments like Render that may not route IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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
        statement_timeout: 30000,
        application_name: 'ak-fancy-billing'
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
      logging: process.env.NODE_ENV !== 'production' ? console.log : false,
      dialectModuleInstance: require('pg'),
      native: false // Disable native bindings
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite'
    });

module.exports = sequelize;