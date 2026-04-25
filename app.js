const express = require('express');
const multer = require('multer');

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const productRoutes = require('./routes/products');
const invoiceRoutes = require('./routes/invoices');

app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);

// Stock export endpoint
app.get('/api/stock/export/xlsx', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const products = await Product.findAll();
    
    // Sort by quantity (low stock first) like the UI
    const sortedProducts = products.sort((a, b) => a.quantity - b.quantity);
    
    const data = sortedProducts.map(product => ({
      Name: product.name,
      Quantity: product.quantity,
      Cost_Price: product.costPrice,
      Price: product.price
    }));

    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="stock.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reports export endpoint
app.get('/api/reports/export/xlsx', async (req, res) => {
  try {
    const { from, to, type } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'From and To dates are required' });
    }

    const Invoice = require('./models/Invoice');
    const Product = require('./models/Product');
    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setDate(endDate.getDate() + 1);

    const invoices = await Invoice.findAll({
      where: {
        date: {
          [require('sequelize').Op.gte]: startDate,
          [require('sequelize').Op.lt]: endDate
        }
      }
    });

    if (type === 'daily') {
      const dailyProfits = {};
      for (let invoice of invoices) {
        const dateKey = invoice.date.toISOString().split('T')[0];
        if (!dailyProfits[dateKey]) dailyProfits[dateKey] = { revenue: 0, cost: 0, profit: 0, invoices: 0 };
        
        dailyProfits[dateKey].invoices++;
        
        for (let item of invoice.items) {
          const product = await Product.findByPk(item.productId);
          if (product) {
            const revenue = item.price * item.quantity;
            const cost = product.costPrice * item.quantity;
            const profit = revenue - cost;
            
            dailyProfits[dateKey].revenue += revenue;
            dailyProfits[dateKey].cost += cost;
            dailyProfits[dateKey].profit += profit;
          }
        }
      }

      const data = Object.keys(dailyProfits).map(date => ({
        Date: date,
        Invoices_Count: dailyProfits[date].invoices,
        Total_Revenue: dailyProfits[date].revenue,
        Total_Cost: dailyProfits[date].cost,
        Total_Profit: dailyProfits[date].profit
      }));

      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daily Reports');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename="daily-reports.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } else {
      // Total profit report
      let totalRevenue = 0;
      let totalCost = 0;
      let totalProfit = 0;
      const invoiceDetails = [];

      for (let invoice of invoices) {
        let invoiceRevenue = 0;
        let invoiceCost = 0;
        
        for (let item of invoice.items) {
          const product = await Product.findByPk(item.productId);
          if (product) {
            const revenue = item.price * item.quantity;
            const cost = product.costPrice * item.quantity;
            
            invoiceRevenue += revenue;
            invoiceCost += cost;
          }
        }
        
        const invoiceProfit = invoiceRevenue - invoiceCost;
        totalRevenue += invoiceRevenue;
        totalCost += invoiceCost;
        totalProfit += invoiceProfit;
        
        invoiceDetails.push({
          Invoice_ID: invoice.id,
          Date: invoice.date,
          Customer_Name: invoice.customerName || '',
          Revenue: invoiceRevenue,
          Cost: invoiceCost,
          Profit: invoiceProfit
        });
      }

      const summaryData = [{
        Period: `${from} to ${to}`,
        Total_Invoices: invoices.length,
        Total_Revenue: totalRevenue,
        Total_Cost: totalCost,
        Total_Profit: totalProfit
      }];

      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      
      const detailsWs = XLSX.utils.json_to_sheet(invoiceDetails);
      XLSX.utils.book_append_sheet(wb, detailsWs, 'Invoice Details');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename="profit-reports.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
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