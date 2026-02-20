const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { toNonEmptyString, toOptionalString, toNonNegativeNumber, toPositiveInteger } = require('../utils/validators');

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
        const name = toNonEmptyString(req.body.name);
        if (!name) {
            return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
        }

        const id = uuidv4();
        const contact = toOptionalString(req.body.contact);
        const email = toOptionalString(req.body.email);
        const phone = toOptionalString(req.body.phone);
        const address = toOptionalString(req.body.address);

        db.prepare(`
      INSERT INTO suppliers (id, name, contact, email, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, contact, email || null, phone || null, address || null);

        res.status(201).json({ id, name, contact, email, phone, address });
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
        const purchaseIds = purchases.map((purchase) => purchase.id);
        const purchaseItems = purchaseIds.length
            ? db.prepare(`SELECT * FROM purchase_items WHERE purchase_id IN (${purchaseIds.map(() => '?').join(',')})`).all(...purchaseIds)
            : [];

        const itemsByPurchase = new Map();
        for (const item of purchaseItems) {
            const current = itemsByPurchase.get(item.purchase_id) || [];
            current.push(item);
            itemsByPurchase.set(item.purchase_id, current);
        }

        const result = purchases.map(purchase => ({
            id: purchase.id,
            date: purchase.date,
            supplierId: purchase.supplier_id,
            supplierName: purchase.supplier_name,
            total: purchase.total,
            invoiceNumber: purchase.invoice_number,
            items: (itemsByPurchase.get(purchase.id) || []).map(item => ({
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
        const supplierId = toNonEmptyString(req.body.supplierId);
        const supplierName = toNonEmptyString(req.body.supplierName);
        const total = toNonNegativeNumber(req.body.total);
        const invoiceNumber = toOptionalString(req.body.invoiceNumber);
        const { items } = req.body;

        if (!supplierId || !supplierName || total === null) {
            return res.status(400).json({ error: 'Datos de compra inválidos' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un producto en la compra' });
        }

        const normalizedItems = [];
        for (const item of items) {
            const quantity = toPositiveInteger(item.quantity);
            const cost = toNonNegativeNumber(item.cost);
            const subtotal = toNonNegativeNumber(item.subtotal);
            const productId = toNonEmptyString(item.productId);
            const productName = toNonEmptyString(item.productName);

            if (!quantity || cost === null || subtotal === null || !productId || !productName) {
                return res.status(400).json({ error: 'Items de compra inválidos' });
            }

            normalizedItems.push({ productId, productName, quantity, cost, subtotal });
        }

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

            for (const item of normalizedItems) {
                insertItem.run(id, item.productId, item.productName, item.quantity, item.cost, item.subtotal);
                updateStock.run(item.quantity, item.productId);
                insertMovement.run(uuidv4(), date, item.productId, item.productName, item.quantity, id);
            }
        });

        createPurchase();

        res.status(201).json({
            id,
            date,
            supplierId,
            supplierName,
            total,
            invoiceNumber: invoiceNumber || null,
            items: normalizedItems
        });
    } catch (error) {
        console.error('Create purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
