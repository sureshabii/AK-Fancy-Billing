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

app.get('/test-db', async (req, res) => {
  try {
    await db.authenticate();
    const [result] = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'Database connected successfully',
      now: result[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.original ? error.original.message : undefined
    });
  }
});

const PORT = process.env.PORT || 3000;

// Start server immediately and attempt DB sync
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Attempt database sync
db.sync({ alter: true })
  .then(() => {
    console.log('Database connected and synced successfully');
  })
  .catch(error => {
    console.error('Database error:', error.message);
    console.error('Full error:', error);
    // Don't exit - server can still serve requests, reconnection will be attempted
  });