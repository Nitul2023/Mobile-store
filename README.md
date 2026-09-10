# MobileStore Admin

An admin-only Mobile Store Inventory & Sales Management System built with HTML5, CSS3, JavaScript and designed for PostgreSQL/Supabase integration.

## Current demo

This ZIP runs immediately as a frontend prototype. It uses `localStorage` so you can test:
- Admin login
- Dashboard
- Brands
- Mobile stock
- IMEI tracking
- Inventory filters
- Sell mobile
- Sold mobile history
- Suppliers
- Reports
- Profit calculations
- Device status management

Demo login:
- Email: `admin@mobilestore.local`
- Password: `admin123`

## PostgreSQL / Supabase

The UI is intentionally separated from the data layer. The file `js/data.js` currently uses localStorage for a zero-setup demo. For production, replace that layer with Supabase client calls.

Recommended database tables:
- users
- brands
- mobile_models
- mobile_devices
- suppliers
- sales
- stock_transactions

Important: do not connect browser JavaScript directly to PostgreSQL. Use Supabase or another secure API layer.

## Run

Open `index.html` in a browser. For best results, serve the folder with a simple local server (for example VS Code Live Server).

## Suggested production stack

HTML5 + CSS3 + JavaScript ES6 + Bootstrap/Tailwind (optional) + Chart.js + Supabase + PostgreSQL.
\n## Mobile responsive navigation\n\nOn small screens the sidebar is replaced by a hamburger menu. Tapping it opens the full navigation items (Dashboard, Inventory, Add Stock, Brands, Sales, Sold Mobiles, Suppliers, Reports and Logout). Tables, forms, cards and dashboard content are also optimized for mobile screens.\n