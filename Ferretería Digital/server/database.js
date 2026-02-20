const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'ferreteria.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
    db.exec(`
    -- Users & Authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin','seller')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products / Inventory
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      barcode TEXT,
      price REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      image TEXT
    );

    -- Sales
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date DATETIME NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash','card','transfer')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    -- Refunds / Returns
    CREATE TABLE IF NOT EXISTS sale_refunds (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      date DATETIME NOT NULL,
      total REAL NOT NULL,
      reason TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sale_refund_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refund_id TEXT NOT NULL REFERENCES sale_refunds(id) ON DELETE CASCADE,
      sale_item_id INTEGER NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      email TEXT,
      phone TEXT,
      address TEXT
    );

    -- Purchases
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      date DATETIME NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      supplier_name TEXT NOT NULL,
      total REAL NOT NULL,
      invoice_number TEXT
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    -- Inventory Movements
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      date DATETIME NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      type TEXT CHECK(type IN ('entry','exit')) NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      reference TEXT
    );
  `);

    // Seed default admin user if no users exist
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        const generatedPassword = crypto.randomBytes(12).toString('base64url');
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || generatedPassword;
        const hashedPassword = bcrypt.hashSync(adminPassword, 12);
        db.prepare(`
      INSERT INTO users (id, username, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Aldy', hashedPassword, 'Aldy', 'admin');
        console.log('✅ Default admin user created (username: Aldy)');
        if (!process.env.DEFAULT_ADMIN_PASSWORD) {
            console.log(`🔐 Generated admin password: ${adminPassword}`);
            console.log('⚠️ Set DEFAULT_ADMIN_PASSWORD to avoid random bootstrap credentials.');
        }
    }
}

module.exports = { db, initializeDatabase };
