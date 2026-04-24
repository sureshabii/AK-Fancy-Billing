const db = require('./db');

async function checkDB() {
  try {
    await db.authenticate();
    console.log('Connection to database successful.');

    // Check if tables exist
    const tables = await db.getQueryInterface().showAllTables();
    console.log('Tables:', tables);

    // Example: Query Products table
    if (tables.includes('Products')) {
      const products = await db.query('SELECT id, sku, name FROM "Products" LIMIT 20', { type: db.QueryTypes.SELECT });
      console.log('Products:', JSON.stringify(products, null, 2));
    }

    // Example: Query Invoices table
    if (tables.includes('Invoices')) {
      const invoices = await db.query('SELECT id, "customerName", total FROM "Invoices" LIMIT 20', { type: db.QueryTypes.SELECT });
      console.log('Invoices:', JSON.stringify(invoices, null, 2));
    }

  } catch (error) {
    console.error('Unable to connect or query database:', error);
  } finally {
    await db.close();
  }
}

checkDB();
