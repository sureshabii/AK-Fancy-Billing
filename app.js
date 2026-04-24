const express = require('express');

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const productRoutes = require('./routes/products');
const invoiceRoutes = require('./routes/invoices');

app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);

const PORT = process.env.PORT || 3000;

db.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Unable to connect to the database:', error);
});