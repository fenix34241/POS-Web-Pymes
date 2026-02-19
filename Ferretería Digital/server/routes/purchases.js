const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

// ─── SUPPLIERS ───────────────────────────────────────────

// GET /api/purchases/suppliers — List suppliers
router.get('/suppliers', (req, res) => {
    try {
        const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
        res.json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/purchases/suppliers — Create supplier
router.post('/suppliers', (req, res) => {
    try {
        const { name, contact, email, phone, address } = req.body;
        const id = uuidv4();

        db.prepare(`
      INSERT INTO suppliers (id, name, contact, email, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, contact || '', email || null, phone || null, address || null);

        res.status(201).json({ id, name, contact: contact || '', email, phone, address });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/purchases/suppliers/:id — Delete supplier
router.delete('/suppliers/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PURCHASES ───────────────────────────────────────────

// GET /api/purchases — List all purchases with items
router.get('/', (req, res) => {
    try {
        const purchases = db.prepare('SELECT * FROM purchases ORDER BY date DESC').all();
        const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');

        const result = purchases.map(purchase => ({
            id: purchase.id,
            date: purchase.date,
            supplierId: purchase.supplier_id,
            supplierName: purchase.supplier_name,
            total: purchase.total,
            invoiceNumber: purchase.invoice_number,
            items: getItems.all(purchase.id).map(item => ({
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                cost: item.cost,
                subtotal: item.subtotal
            }))
        }));

        res.json(result);
    } catch (error) {
        console.error('Get purchases error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/purchases — Create purchase (with items, updates stock, creates movements)
router.post('/', (req, res) => {
    try {
        const { supplierId, supplierName, items, total, invoiceNumber } = req.body;
        const id = uuidv4();
        const date = new Date().toISOString();

        const insertPurchase = db.prepare(`
      INSERT INTO purchases (id, date, supplier_id, supplier_name, total, invoice_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const insertItem = db.prepare(`
      INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, cost, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

        const insertMovement = db.prepare(`
      INSERT INTO inventory_movements (id, date, product_id, product_name, type, quantity, reason, reference)
      VALUES (?, ?, ?, ?, 'entry', ?, 'Compra', ?)
    `);

        const createPurchase = db.transaction(() => {
            insertPurchase.run(id, date, supplierId, supplierName, total, invoiceNumber || null);

            for (const item of items) {
                insertItem.run(id, item.productId, item.productName, item.quantity, item.cost, item.subtotal);
                updateStock.run(item.quantity, item.productId);
                insertMovement.run(uuidv4(), date, item.productId, item.productName, item.quantity, id);
            }
        });

        createPurchase();

        res.status(201).json({
            id, date, supplierId, supplierName, total,
            invoiceNumber: invoiceNumber || null,
            items: items.map(i => ({
                productId: i.productId,
                productName: i.productName,
                quantity: i.quantity,
                cost: i.cost,
                subtotal: i.subtotal
            }))
        });
    } catch (error) {
        console.error('Create purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
