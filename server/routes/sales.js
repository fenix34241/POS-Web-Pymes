const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

// GET /api/sales — List all sales with items
router.get('/', (req, res) => {
    try {
        const sales = db.prepare('SELECT * FROM sales ORDER BY date DESC').all();
        const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');

        const result = sales.map(sale => ({
            id: sale.id,
            date: sale.date,
            subtotal: sale.subtotal,
            discount: sale.discount,
            total: sale.total,
            paymentMethod: sale.payment_method,
            items: getItems.all(sale.id).map(item => ({
                id: item.id,
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal
            }))
        }));

        res.json(result);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/sales — Create sale (with items, updates stock, creates movements)
router.post('/', (req, res) => {
    try {
        const { items, subtotal, discount, total, paymentMethod } = req.body;
        const id = uuidv4();
        const date = new Date().toISOString();

        const insertSale = db.prepare(`
      INSERT INTO sales (id, date, subtotal, discount, total, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

        const insertMovement = db.prepare(`
      INSERT INTO inventory_movements (id, date, product_id, product_name, type, quantity, reason, reference)
      VALUES (?, ?, ?, ?, 'exit', ?, 'Venta', ?)
    `);

        // Transaction: sale + items + stock updates + movements
        const createSale = db.transaction(() => {
            insertSale.run(id, date, subtotal, discount || 0, total, paymentMethod);

            for (const item of items) {
                insertItem.run(id, item.productId, item.productName, item.quantity, item.price, item.subtotal);
                updateStock.run(item.quantity, item.productId);
                insertMovement.run(uuidv4(), date, item.productId, item.productName, item.quantity, id);
            }
        });

        createSale();

        // Read back the inserted sale_items to return their real IDs
        const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
        const insertedItems = getItems.all(id).map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
        }));

        res.status(201).json({
            id,
            date,
            items: insertedItems,
            subtotal,
            discount: discount || 0,
            total,
            paymentMethod
        });
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
