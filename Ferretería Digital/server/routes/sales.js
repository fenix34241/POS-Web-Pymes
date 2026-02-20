const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { toNonNegativeNumber, toPositiveInteger, toNonEmptyString } = require('../utils/validators');

const mapSaleItem = (item) => ({
    id: item.id,
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal
});

// GET /api/sales — List all sales with items
router.get('/', (req, res) => {
    try {
        const sales = db.prepare('SELECT * FROM sales ORDER BY date DESC').all();
        const saleIds = sales.map((sale) => sale.id);

        const saleItems = saleIds.length
            ? db.prepare(`SELECT * FROM sale_items WHERE sale_id IN (${saleIds.map(() => '?').join(',')})`).all(...saleIds)
            : [];
        const refundedRows = saleIds.length
            ? db.prepare(`
                SELECT sri.sale_item_id, COALESCE(SUM(sri.quantity), 0) AS refunded_quantity
                FROM sale_refund_items sri
                INNER JOIN sale_items si ON si.id = sri.sale_item_id
                WHERE si.sale_id IN (${saleIds.map(() => '?').join(',')})
                GROUP BY sri.sale_item_id
            `).all(...saleIds)
            : [];

        const itemsBySale = new Map();
        for (const item of saleItems) {
            const current = itemsBySale.get(item.sale_id) || [];
            current.push(item);
            itemsBySale.set(item.sale_id, current);
        }

        const refundedByItem = Object.fromEntries(refundedRows.map((row) => [row.sale_item_id, row.refunded_quantity]));

        const result = sales.map(sale => ({
            id: sale.id,
            date: sale.date,
            subtotal: sale.subtotal,
            discount: sale.discount,
            total: sale.total,
            paymentMethod: sale.payment_method,
            items: (itemsBySale.get(sale.id) || []).map(item => ({
                ...mapSaleItem(item),
                refundedQuantity: refundedByItem[item.id] || 0
            }))
        }));

        res.json(result);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sales/:id/refunds — List refunds for a sale
router.get('/:id/refunds', (req, res) => {
    try {
        const { id } = req.params;

        const sale = db.prepare('SELECT id FROM sales WHERE id = ?').get(id);
        if (!sale) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const refunds = db.prepare('SELECT * FROM sale_refunds WHERE sale_id = ? ORDER BY date DESC').all(id);
        const getRefundItems = db.prepare('SELECT * FROM sale_refund_items WHERE refund_id = ? ORDER BY id ASC');

        const result = refunds.map(refund => ({
            id: refund.id,
            saleId: refund.sale_id,
            date: refund.date,
            total: refund.total,
            reason: refund.reason,
            items: getRefundItems.all(refund.id).map(item => ({
                saleItemId: item.sale_item_id,
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal
            }))
        }));

        res.json(result);
    } catch (error) {
        console.error('Get refunds error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/sales — Create sale (with items, updates stock, creates movements)
router.post('/', (req, res) => {
    try {
        const { items, subtotal, discount, total, paymentMethod } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un producto en la venta' });
        }

        const parsedSubtotal = toNonNegativeNumber(subtotal);
        const parsedDiscount = toNonNegativeNumber(discount || 0);
        const parsedTotal = toNonNegativeNumber(total);
        const parsedPaymentMethod = toNonEmptyString(paymentMethod);

        if (parsedSubtotal === null || parsedDiscount === null || parsedTotal === null || !parsedPaymentMethod) {
            return res.status(400).json({ error: 'Totales o método de pago inválidos' });
        }

        const normalizedItems = [];
        for (const item of items) {
            const quantity = toPositiveInteger(item.quantity);
            const price = toNonNegativeNumber(item.price);
            const itemSubtotal = toNonNegativeNumber(item.subtotal);
            const productId = toNonEmptyString(item.productId);
            const productName = toNonEmptyString(item.productName);

            if (!quantity || price === null || itemSubtotal === null || !productId || !productName) {
                return res.status(400).json({ error: 'Items de venta inválidos' });
            }

            const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(productId);
            if (!product) {
                return res.status(400).json({ error: `Producto no encontrado: ${productId}` });
            }
            if (product.stock < quantity) {
                return res.status(409).json({ error: `Stock insuficiente para el producto ${productName}` });
            }

            normalizedItems.push({ productId, productName, quantity, price, subtotal: itemSubtotal });
        }

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

        const createSale = db.transaction(() => {
            insertSale.run(id, date, parsedSubtotal, parsedDiscount, parsedTotal, parsedPaymentMethod);

            for (const item of normalizedItems) {
                insertItem.run(id, item.productId, item.productName, item.quantity, item.price, item.subtotal);
                updateStock.run(item.quantity, item.productId);
                insertMovement.run(uuidv4(), date, item.productId, item.productName, item.quantity, id);
            }
        });

        createSale();

        res.status(201).json({
            id,
            date,
            items: normalizedItems,
            subtotal: parsedSubtotal,
            discount: parsedDiscount,
            total: parsedTotal,
            paymentMethod: parsedPaymentMethod
        });
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/sales/:id/refunds — Create refund/return for sold items
router.post('/:id/refunds', (req, res) => {
    try {
        const saleId = req.params.id;
        const { reason = '', items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Debe enviar al menos un item para devolver' });
        }

        const sale = db.prepare('SELECT id FROM sales WHERE id = ?').get(saleId);
        if (!sale) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
        const saleItemsById = new Map(saleItems.map(item => [item.id, item]));

        const refundedBySaleItemRows = db.prepare(`
      SELECT sale_item_id, COALESCE(SUM(quantity), 0) AS refunded_quantity
      FROM sale_refund_items
      WHERE sale_item_id IN (
        SELECT id FROM sale_items WHERE sale_id = ?
      )
      GROUP BY sale_item_id
    `).all(saleId);
        const refundedBySaleItem = Object.fromEntries(refundedBySaleItemRows.map(row => [row.sale_item_id, row.refunded_quantity]));

        const normalizedItems = [];
        let refundTotal = 0;

        for (const item of items) {
            const saleItemId = Number(item.saleItemId);
            const quantity = Number(item.quantity);

            if (!Number.isInteger(saleItemId) || !Number.isFinite(quantity) || quantity <= 0) {
                return res.status(400).json({ error: 'Datos de devolución inválidos' });
            }

            const saleItem = saleItemsById.get(saleItemId);
            if (!saleItem) {
                return res.status(400).json({ error: `El item de venta ${saleItemId} no existe en la venta` });
            }

            const alreadyRefunded = refundedBySaleItem[saleItemId] || 0;
            const availableQty = saleItem.quantity - alreadyRefunded;
            if (quantity > availableQty) {
                return res.status(400).json({
                    error: `Cantidad inválida para ${saleItem.product_name}. Disponible para devolver: ${availableQty}`
                });
            }

            const subtotal = Number((saleItem.price * quantity).toFixed(2));
            refundTotal += subtotal;

            normalizedItems.push({
                saleItemId,
                productId: saleItem.product_id,
                productName: saleItem.product_name,
                quantity,
                price: saleItem.price,
                subtotal
            });
        }

        if (normalizedItems.length === 0) {
            return res.status(400).json({ error: 'No hay items válidos para devolver' });
        }

        const refundId = uuidv4();
        const date = new Date().toISOString();

        const insertRefund = db.prepare(`
      INSERT INTO sale_refunds (id, sale_id, date, total, reason)
      VALUES (?, ?, ?, ?, ?)
    `);

        const insertRefundItem = db.prepare(`
      INSERT INTO sale_refund_items (refund_id, sale_item_id, product_id, product_name, quantity, price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

        const insertMovement = db.prepare(`
      INSERT INTO inventory_movements (id, date, product_id, product_name, type, quantity, reason, reference)
      VALUES (?, ?, ?, ?, 'entry', ?, 'Devolución de venta', ?)
    `);

        const createRefund = db.transaction(() => {
            insertRefund.run(refundId, saleId, date, Number(refundTotal.toFixed(2)), reason);

            for (const item of normalizedItems) {
                insertRefundItem.run(
                    refundId,
                    item.saleItemId,
                    item.productId,
                    item.productName,
                    item.quantity,
                    item.price,
                    item.subtotal
                );
                updateStock.run(item.quantity, item.productId);
                insertMovement.run(uuidv4(), date, item.productId, item.productName, item.quantity, refundId);
            }
        });

        createRefund();

        res.status(201).json({
            id: refundId,
            saleId,
            date,
            total: Number(refundTotal.toFixed(2)),
            reason,
            items: normalizedItems
        });
    } catch (error) {
        console.error('Create refund error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
