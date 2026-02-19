const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET /api/dashboard — Aggregated metrics
router.get('/', (req, res) => {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Today's sales
        const todayStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales WHERE date >= ?
    `).get(todayStr);

        // Week's sales
        const weekStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales WHERE date >= ?
    `).get(weekAgo);

        // Month's sales
        const monthStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales WHERE date >= ?
    `).get(monthAgo);

        // Low stock products
        const lowStock = db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE stock <= min_stock
    `).get();

        // Total products
        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();

        // Daily sales for last 7 days
        const dailySales = [];
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextDateStr = nextDate.toISOString().split('T')[0];

            const dayStat = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM sales WHERE date >= ? AND date < ?
      `).get(dateStr, nextDateStr);

            dailySales.push({
                day: days[date.getDay()],
                ventas: Math.round(dayStat.total)
            });
        }

        // Top 5 products by revenue
        const topProducts = db.prepare(`
      SELECT product_name as name, SUM(quantity) as quantity, SUM(subtotal) as revenue
      FROM sale_items
      GROUP BY product_id
      ORDER BY revenue DESC
      LIMIT 5
    `).all();

        res.json({
            todayTotal: todayStats.total,
            todayCount: todayStats.count,
            weekTotal: weekStats.total,
            monthTotal: monthStats.total,
            lowStockCount: lowStock.count,
            totalProducts: totalProducts.count,
            dailySales,
            topProducts
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
