# ◈ NexMart — AI E-Commerce (PHP + XAMPP)

A premium full-stack e-commerce website with AI-powered recommendations, built with PHP, MySQL, and vanilla JavaScript.

---

## 📁 Project Structure

```
nexmart/
├── index.html              ← Main frontend (all pages in one SPA)
├── database.sql            ← Database schema + seed data
├── assets/
│   ├── css/style.css       ← Premium dark luxury stylesheet
│   └── js/app.js           ← Frontend logic & API calls
└── api/
    ├── config.php          ← DB config & helper functions
    ├── auth.php            ← Login / Register / Profile
    ├── products.php        ← Catalog, Search, Recommendations, History
    ├── cart.php            ← Cart CRUD
    ├── orders.php          ← Checkout & Order history
    └── analytics.php      ← Dashboard metrics & charts
```

---

## ⚡ Setup Instructions (XAMPP)

### Step 1 — Copy project files
```
Copy the entire `nexmart/` folder to:
C:\xampp\htdocs\nexmart\
```

### Step 2 — Start XAMPP
- Open **XAMPP Control Panel**
- Start **Apache** and **MySQL**

### Step 3 — Create the database
1. Open your browser → go to `http://localhost/phpmyadmin`
2. Click **"New"** in the left sidebar
3. Create database named: `nexmart`
4. Click the `nexmart` database
5. Go to **"Import"** tab
6. Click **"Choose File"** → select `nexmart/database.sql`
7. Click **"Go"** — this creates all tables and sample data

### Step 4 — Configure database (if needed)
Open `api/config.php` and update if your MySQL credentials differ:
```php
define('DB_USER', 'root');   // Your MySQL username
define('DB_PASS', '');        // Your MySQL password (blank by default in XAMPP)
```

### Step 5 — Open the app
Visit: **http://localhost/nexmart/**

---

## 🔐 Login Credentials

| Account       | Email                  | Password   | Role  |
|--------------|------------------------|------------|-------|
| Admin User   | admin@nexmart.com      | admin123   | Admin |
| Demo User    | Register any email     | any 6+ chars | User |

> Note: The admin account password hash in database.sql is for "password" (Laravel default). 
> To use "admin123", register through the UI or update the hash.
> To generate a hash: `<?php echo password_hash('admin123', PASSWORD_BCRYPT); ?>`

---

## 🌟 Features

| Feature | Description |
|---------|------------|
| **User Auth** | Register, Login, JWT-style tokens, session persistence |
| **Product Catalog** | 15 seeded products, filter by category, sort by price/rating/views |
| **AI Search** | Real-time keyword suggestions with category matching |
| **Smart Recommendations** | Based on user's browsing history + category preferences |
| **Browse History** | Tracks viewed products per user |
| **Cart System** | Add, update qty, remove, persistent per user |
| **Checkout** | Address + payment method, stock validation, order creation |
| **Order History** | Full order list with status tracking |
| **Analytics Dashboard** | Views chart, category chart, recent orders, key metrics |

---

## 🔌 API Reference

### Auth API (`/api/auth.php`)
| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `?action=login` | POST | `{email, password}` | Login user |
| `?action=register` | POST | `{name, email, password}` | Register user |
| `?action=profile` | GET | — | Get current user (requires token) |

### Products API (`/api/products.php`)
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `?action=list` | GET | `category, sort, search, limit` | Get product list |
| `?action=detail&id=X` | GET | — | Get single product + log view |
| `?action=search_suggest&q=X` | GET | — | Live search suggestions |
| `?action=recommend` | GET | — | AI recommendations (personalized or trending) |
| `?action=history` | GET | — | User browse history (requires token) |
| `?action=categories` | GET | — | All categories with counts |

### Cart API (`/api/cart.php`) — All require token
| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `?action=get` | GET | — | Get cart items & totals |
| `?action=add` | POST | `{product_id, quantity}` | Add item to cart |
| `?action=update` | POST | `{product_id, quantity}` | Update item qty |
| `?action=remove` | POST | `{product_id}` | Remove item |
| `?action=clear` | POST | — | Clear entire cart |

### Orders API (`/api/orders.php`) — All require token
| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `?action=checkout` | POST | `{address, payment_method}` | Place order |
| `?action=list` | GET | — | Get order history |
| `?action=detail&id=X` | GET | — | Get order details |

### Analytics API (`/api/analytics.php`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| (default) | GET | All dashboard metrics |

---

## 🎨 Design System

- **Theme**: Dark luxury — deep navy/black with warm gold accents
- **Fonts**: Cormorant Garamond (headings) + Jost (body)
- **Colors**: `--gold: #c9a84c`, `--accent: #7b6ef6`, `--teal: #00d4aa`
- **Single Page App**: All 6 pages rendered in one HTML file via JS

---

## 🛠️ Troubleshooting

**"Database connection failed"**
→ Make sure MySQL is running in XAMPP and `nexmart` database exists

**"Network error. Check XAMPP is running"**
→ Apache must be running, and you must access via `http://localhost/nexmart/` (not file://)

**CORS issues**
→ The `config.php` sets CORS headers — make sure you're on localhost

**404 on API calls**
→ Verify your folder is at `C:\xampp\htdocs\nexmart\` and PHP files are in `api\` subfolder
