const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const db = require('../db');

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.findAll();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET profit report
router.get('/profit', async (req, res) => {
  try {
    const { from, to, type } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'From and To dates are required' });
    }
    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setDate(endDate.getDate() + 1); // Include the end date

    const invoices = await Invoice.findAll({
      where: {
        date: {
          [db.Sequelize.Op.gte]: startDate,
          [db.Sequelize.Op.lt]: endDate
        }
      }
    });

    if (type === 'daily') {
      const dailyProfits = {};
      for (let invoice of invoices) {
        const dateKey = invoice.date.toISOString().split('T')[0];
        if (!dailyProfits[dateKey]) dailyProfits[dateKey] = 0;
        for (let item of invoice.items) {
          const product = await Product.findByPk(item.productId);
          if (product) {
            const profitPerItem = (item.price - product.costPrice) * item.quantity;
            dailyProfits[dateKey] += profitPerItem;
          }
        }
      }
      const result = Object.keys(dailyProfits).map(date => ({
        date,
        profit: dailyProfits[date].toFixed(2)
      })).sort((a, b) => a.date.localeCompare(b.date));
      res.json(result);
    } else {
      let totalProfit = 0;
      for (let invoice of invoices) {
        for (let item of invoice.items) {
          const product = await Product.findByPk(item.productId);
          if (product) {
            const profitPerItem = (item.price - product.costPrice) * item.quantity;
            totalProfit += profitPerItem;
          }
        }
      }
      res.json({ totalProfit: totalProfit.toFixed(2) });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create invoice
router.post('/', async (req, res) => {
  try {
    const { customerName, items } = req.body; // items: [{productId, quantity}]
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    let total = 0;
    const validatedItems = [];
    for (let item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
      }
      const discountedPrice = product.price; // No discount
      total += discountedPrice * item.quantity;
      product.quantity -= item.quantity;
      await product.save();
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        discountedPrice
      });
    }
    const invoice = await Invoice.create({ customerName, total, items: validatedItems });
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE invoice by ID
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    // Restore product quantities
    for (let item of invoice.items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }
    await invoice.destroy();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;