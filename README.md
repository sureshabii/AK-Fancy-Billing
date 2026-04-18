# Billing and Stock Management

A sample Node.js project for managing billing and stock using Express and Sequelize with SQLite, including a web UI.

## Installation

1. Clone or download the project.
2. Run `npm install` to install dependencies..

## Running the Application

Run `npm start` to start the server on port 3000.

Visit `http://localhost:3000` in your browser to access the web interface.

## Web Interface

The web UI allows you to:
- View, add, edit, and delete products.
- View invoices and create new ones by selecting products and quantities.
- Print invoices instantly after creation or from the invoice list.
- Scan product QR codes to add items directly into a bill.

## API Endpoints

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create a new product (body: {name, description, price, quantity})
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Invoices

- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create a new invoice (body: {customerName, items: [{productId, quantity}]})

When creating an invoice, the stock quantities are automatically updated.

## Example Usage

1. Open `http://localhost:3000` in your browser.
2. Add products using the Products section.
3. Create invoices using the Invoices section, which will deduct from stock.

## Troubleshooting

- Ensure Node.js and npm are installed.
- If database issues, delete database.sqlite and restart.