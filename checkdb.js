const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
  db.each("PRAGMA table_info('Products')", (err, row) => {
    if (err) throw err;
    console.log('col', row.name, row.type);
  });
  db.all('SELECT id, sku, name FROM Products LIMIT 20', (err, rows) => {
    if (err) throw err;
    console.log('rows', JSON.stringify(rows, null, 2));
    db.close();
  });
});
