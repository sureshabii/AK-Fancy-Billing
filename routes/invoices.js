const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const db = require('../db');
const XLSX = require('xlsx');

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
          const costPrice = product ? product.costPrice : (item.costPrice || 0);
          const profitPerItem = (item.price - costPrice) * item.quantity;
          dailyProfits[dateKey] += profitPerItem;
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
          const costPrice = product ? product.costPrice : (item.costPrice || 0);
          const profitPerItem = (item.price - costPrice) * item.quantity;
          totalProfit += profitPerItem;
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
        productName: product.name,
        sku: product.sku || null,
        quantity: item.quantity,
        price: product.price,
        discountedPrice,
        costPrice: product.costPrice
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

// Export invoices to XLSX with optional date filter
router.get('/export/xlsx', async (req, res) => {
  try {
    const { from, to } = req.query;
    let whereClause = {};

    if (from && to) {
      const startDate = new Date(from);
      const endDate = new Date(to);
      endDate.setDate(endDate.getDate() + 1);
      whereClause.date = {
        [db.Sequelize.Op.gte]: startDate,
        [db.Sequelize.Op.lt]: endDate
      };
    }

    const invoices = await Invoice.findAll({ where: whereClause });
    const data = [];
    let invoiceCounter = 1;

    for (let invoice of invoices) {
      for (let item of invoice.items) {
        const itemName = item.productName || 'Unknown';
        const itemSku = item.sku || `SKU-${item.productId}`;
        data.push({
          Invoice_No: invoiceCounter,
          Invoice_ID: invoice.id,
          Date: invoice.date,
          Product_Name: itemName,
          SKU: itemSku,
          Quantity: item.quantity,
          Unit_Price: item.price,
          Line_Total: item.quantity * item.price,
          Invoice_Total: invoice.total
        });
      }
      invoiceCounter += 1;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice Items');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;