const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

// GET /api/refunds — List all refunds
router.get('/', (req, res) => {
    try {
        const refunds = db.prepare('SELECT * FROM refunds ORDER BY date DESC').all();
        const getItems = db.prepare('SELECT * FROM refund_items WHERE refund_id = ?');

        const result = refunds.map(refund => ({
            id: refund.id,
            saleId: refund.sale_id,
            date: refund.date,
            subtotal: refund.subtotal,
            total: refund.total,
            reason: refund.reason,
            reasonDetail: refund.reason_detail,
            status: refund.status,
            createdAt: refund.created_at,
            approvedBy: refund.approved_by,
            items: getItems.all(refund.id).map(item => ({
                id: item.id,
                saleItemId: item.sale_item_id,
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                originalPrice: item.original_price,
                refundAmount: item.refund_amount
            }))
        }));

        res.json(result);
    } catch (error) {
        console.error('Get refunds error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/refunds/:id — Get specific refund
router.get('/:id', (req, res) => {
    try {
        const refund = db.prepare('SELECT * FROM refunds WHERE id = ?').get(req.params.id);
        if (!refund) {
            return res.status(404).json({ error: 'Refund not found' });
        }

        const items = db.prepare('SELECT * FROM refund_items WHERE refund_id = ?').all(req.params.id);

        res.json({
            id: refund.id,
            saleId: refund.sale_id,
            date: refund.date,
            subtotal: refund.subtotal,
            total: refund.total,
            reason: refund.reason,
            reasonDetail: refund.reason_detail,
            status: refund.status,
            createdAt: refund.created_at,
            approvedBy: refund.approved_by,
            items: items.map(item => ({
                id: item.id,
                saleItemId: item.sale_item_id,
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                originalPrice: item.original_price,
                refundAmount: item.refund_amount
            }))
        });
    } catch (error) {
        console.error('Get refund error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/refunds — Create new refund request
router.post('/', (req, res) => {
    try {
        const { saleId, items, reason, reasonDetail } = req.body;

        // Validate sale exists
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Validate all items belong to the sale
        const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
        for (const item of items) {
            const saleItem = saleItems.find(si => si.id === item.saleItemId);
            if (!saleItem) {
                return res.status(400).json({ error: `Item ${item.saleItemId} does not belong to this sale` });
            }
        }

        const refundId = uuidv4();
        const date = new Date().toISOString();

        // Calculate total refund amount
        let totalRefund = 0;
        for (const item of items) {
            totalRefund += item.refundAmount;
        }

        const insertRefund = db.prepare(`
            INSERT INTO refunds (id, sale_id, date, subtotal, total, reason, reason_detail, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `);

        const insertRefundItem = db.prepare(`
            INSERT INTO refund_items (refund_id, sale_item_id, product_id, product_name, quantity, original_price, refund_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        // Transaction
        const createRefund = db.transaction(() => {
            insertRefund.run(refundId, saleId, date, totalRefund, totalRefund, reason, reasonDetail || null);

            for (const item of items) {
                const saleItem = saleItems.find(si => si.id === item.saleItemId);
                insertRefundItem.run(
                    refundId,
                    item.saleItemId,
                    saleItem.product_id,
                    saleItem.product_name,
                    item.quantity,
                    saleItem.price,
                    item.refundAmount
                );
            }
        });

        createRefund();

        res.status(201).json({
            id: refundId,
            saleId,
            date,
            subtotal: totalRefund,
            total: totalRefund,
            reason,
            reasonDetail: reasonDetail || null,
            status: 'pending',
            createdAt: date,
            approvedBy: null,
            items: items.map(item => {
                const saleItem = saleItems.find(si => si.id === item.saleItemId);
                return {
                    id: item.saleItemId,
                    saleItemId: item.saleItemId,
                    productId: saleItem.product_id,
                    productName: saleItem.product_name,
                    quantity: item.quantity,
                    originalPrice: saleItem.price,
                    refundAmount: item.refundAmount
                };
            })
        });
    } catch (error) {
        console.error('Create refund error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/refunds/:id/approve — Approve refund and restore stock
router.put('/:id/approve', (req, res) => {
    try {
        const { userId } = req.body;

        // Get refund
        const refund = db.prepare('SELECT * FROM refunds WHERE id = ?').get(req.params.id);
        if (!refund) {
            return res.status(404).json({ error: 'Refund not found' });
        }

        if (refund.status !== 'pending') {
            return res.status(400).json({ error: `Refund cannot be approved. Current status: ${refund.status}` });
        }

        const refundItems = db.prepare('SELECT * FROM refund_items WHERE refund_id = ?').all(req.params.id);

        const updateRefund = db.prepare(`
            UPDATE refunds SET status = 'completed', approved_by = ? WHERE id = ?
        `);

        const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

        const insertMovement = db.prepare(`
            INSERT INTO inventory_movements (id, date, product_id, product_name, type, quantity, reason, reference)
            VALUES (?, ?, ?, ?, 'entry', ?, 'Devolución Aprobada', ?)
        `);

        // Transaction
        const approveRefund = db.transaction(() => {
            updateRefund.run(userId, req.params.id);

            for (const item of refundItems) {
                // Restore stock
                updateStock.run(item.quantity, item.product_id);
                // Create inventory movement
                insertMovement.run(uuidv4(), new Date().toISOString(), item.product_id, item.product_name, item.quantity, req.params.id);
            }
        });

        approveRefund();

        res.json({
            id: req.params.id,
            status: 'completed',
            message: 'Refund approved and stock restored'
        });
    } catch (error) {
        console.error('Approve refund error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/refunds/:id/reject — Reject refund request
router.put('/:id/reject', (req, res) => {
    try {
        const refund = db.prepare('SELECT * FROM refunds WHERE id = ?').get(req.params.id);
        if (!refund) {
            return res.status(404).json({ error: 'Refund not found' });
        }

        if (refund.status !== 'pending') {
            return res.status(400).json({ error: `Refund cannot be rejected. Current status: ${refund.status}` });
        }

        const updateRefund = db.prepare(`
            UPDATE refunds SET status = 'rejected' WHERE id = ?
        `);

        updateRefund.run(req.params.id);

        res.json({
            id: req.params.id,
            status: 'rejected',
            message: 'Refund request rejected'
        });
    } catch (error) {
        console.error('Reject refund error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
