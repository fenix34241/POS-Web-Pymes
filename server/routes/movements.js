const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

// GET /api/movements — List all movements
router.get('/', (req, res) => {
    try {
        const movements = db.prepare('SELECT * FROM inventory_movements ORDER BY date DESC').all();
        res.json(movements.map(m => ({
            id: m.id,
            date: m.date,
            productId: m.product_id,
            productName: m.product_name,
            type: m.type,
            quantity: m.quantity,
            reason: m.reason || '',
            reference: m.reference || ''
        })));
    } catch (error) {
        console.error('Get movements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/movements — Create movement (manual adjustment)
router.post('/', (req, res) => {
    try {
        const { productId, productName, type, quantity, reason, reference } = req.body;
        const id = uuidv4();
        const date = new Date().toISOString();

        const insertMovement = db.prepare(`
      INSERT INTO inventory_movements (id, date, product_id, product_name, type, quantity, reason, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const updateStock = type === 'entry'
            ? db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
            : db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

        const create = db.transaction(() => {
            insertMovement.run(id, date, productId, productName, type, quantity, reason || '', reference || null);
            updateStock.run(quantity, productId);
        });

        create();

        res.status(201).json({
            id, date, productId, productName, type, quantity,
            reason: reason || '', reference: reference || ''
        });
    } catch (error) {
        console.error('Create movement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
