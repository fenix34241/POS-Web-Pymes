const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

// GET /api/users — List all users
router.get('/', (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, name, role, created_at as createdAt FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/users — Create user
router.post('/', (req, res) => {
    try {
        const { username, password, name, role } = req.body;

        if (!username || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if username already exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const id = uuidv4();
        const password_hash = bcrypt.hashSync(password, 10);

        db.prepare(`
      INSERT INTO users (id, username, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username, password_hash, name, role);

        res.status(201).json({
            id,
            username,
            name,
            role,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/users/:id — Delete user
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
