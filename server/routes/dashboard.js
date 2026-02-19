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

        // Today's sales (subtract refunds)
        const todaySales = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales WHERE date >= ?
    `).get(todayStr);
        const todayRefunds = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM refunds WHERE date >= ?
    `).get(todayStr);
        const todayStats = { count: todaySales.count, total: todaySales.total - todayRefunds.total };

        // Week's sales (subtract refunds)
        const weekSales = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales WHERE date >= ?
    `).get(weekAgo);
        const weekRefunds = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM refunds WHERE date >= ?
    `).get(weekAgo);
        const weekStats = { count: weekSales.count, total: weekSales.total - weekRefunds.total };

        // Month's sales (subtract refunds)
        const monthSales = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales WHERE date >= ?
    `).get(monthAgo);
        const monthRefunds = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM refunds WHERE date >= ?
    `).get(monthAgo);
        const monthStats = { count: monthSales.count, total: monthSales.total - monthRefunds.total };

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

            // Subtract refunds for the same day
            const refundDayStat = db.prepare(`
          SELECT COALESCE(SUM(total), 0) as total FROM refunds WHERE date >= ? AND date < ?
          `).get(dateStr, nextDateStr);

            dailySales.push({
              day: days[date.getDay()],
              ventas: Math.round(dayStat.total - refundDayStat.total)
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
