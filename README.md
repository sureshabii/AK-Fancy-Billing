# Billing and Stock Management

A sample Node.js project for managing billing and stock using Express and Sequelize with PostgreSQL (Supabase), including a web UI.

## Installation

1. Clone or download the project.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and fill in your Supabase details.

## Running the Application

Run `npm start` to start the server on port 3000.

Visit `http://localhost:3000` in your browser to access the web interface.

## Database Setup

This app uses Supabase (PostgreSQL) for production. For local development, it falls back to SQLite.

1. Set up a Supabase project at [supabase.com](https://supabase.com).
2. Get your `DATABASE_URL` and `SUPABASE_ANON_KEY`.
3. Add them to `.env`.
4. Run `node checkdb.js` to verify connection and view data.

## Deployment to Render

1. Push code to GitHub.
2. Create a Render account at [render.com](https://render.com).
3. Create a new Web Service from your GitHub repo.
4. Set build command: `npm install`.
5. Set start command: `npm start`.
6. Add environment variables in Render dashboard: `DATABASE_URL`, `SUPABASE_ANON_KEY`, `NODE_ENV=production`.
7. Deploy.

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
- For database issues, check `node checkdb.js` output.
- If database issues, delete database.sqlite and restart.