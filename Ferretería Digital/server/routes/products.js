const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { toNonEmptyString, toOptionalString, toNonNegativeNumber } = require('../utils/validators');

// ─── Multer Configuration ─────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const PRODUCTS_UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'products');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(PRODUCTS_UPLOAD_DIR)) {
            fs.mkdirSync(PRODUCTS_UPLOAD_DIR, { recursive: true });
        }
        cb(null, PRODUCTS_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG y WEBP.'));
        }
    },
});

function parseProductPayload(payload) {
    const name = toNonEmptyString(payload.name);
    const barcode = toOptionalString(payload.barcode);
    const price = toNonNegativeNumber(payload.price);
    const cost = toNonNegativeNumber(payload.cost);
    const stock = toNonNegativeNumber(payload.stock);
    const minStock = toNonNegativeNumber(payload.minStock);
    const category = toOptionalString(payload.category);
    const brand = toOptionalString(payload.brand);

    if (!name || price === null || cost === null || stock === null || minStock === null) {
        return null;
    }

    return { name, barcode, price, cost, stock, minStock, category, brand };
}

// Helper to delete an image file from disk
function deleteImageFile(imagePath) {
    if (!imagePath) return;

    const relativePath = imagePath.replace(/^\/+/, '');
    const fullPath = path.resolve(__dirname, '..', relativePath);
    if (!fullPath.startsWith(PRODUCTS_UPLOAD_DIR)) {
        console.warn('Blocked attempt to delete file outside uploads/products:', imagePath);
        return;
    }

    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
        } catch (err) {
            console.error('Error deleting image file:', err);
        }
    }
}

// Helper to map DB row to API response
function mapProduct(p) {
    return {
        id: p.id,
        name: p.name,
        barcode: p.barcode || '',
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        minStock: p.min_stock,
        category: p.category || '',
        brand: p.brand || '',
        image: p.image || '',
    };
}

// ─── GET /api/products ─────────────────────────────────────
router.get('/', (req, res) => {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY name').all();
        res.json(products.map(mapProduct));
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/products — Create product (multipart) ──────
router.post('/', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen no debe superar 2 MB.' });
            }
            return res.status(400).json({ error: err.message });
        }
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            const parsed = parseProductPayload(req.body);
            if (!parsed) {
                if (req.file) deleteImageFile(`uploads/products/${req.file.filename}`);
                return res.status(400).json({ error: 'Datos de producto inválidos' });
            }

            const id = uuidv4();
            const imagePath = req.file ? `uploads/products/${req.file.filename}` : null;

            db.prepare(`
                INSERT INTO products (id, name, barcode, price, cost, stock, min_stock, category, brand, image)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id, parsed.name, parsed.barcode || null,
                parsed.price, parsed.cost,
                parsed.stock, parsed.minStock,
                parsed.category, parsed.brand, imagePath
            );

            res.status(201).json({
                id,
                ...parsed,
                image: imagePath || '',
            });
        } catch (error) {
            if (req.file) deleteImageFile(`uploads/products/${req.file.filename}`);
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// ─── PUT /api/products/:id — Update product (multipart) ───
router.put('/:id', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen no debe superar 2 MB.' });
            }
            return res.status(400).json({ error: err.message });
        }
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            const parsed = parseProductPayload(req.body);
            if (!parsed) {
                if (req.file) deleteImageFile(`uploads/products/${req.file.filename}`);
                return res.status(400).json({ error: 'Datos de producto inválidos' });
            }

            const { removeImage } = req.body;
            const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
            if (!existing) {
                if (req.file) deleteImageFile(`uploads/products/${req.file.filename}`);
                return res.status(404).json({ error: 'Product not found' });
            }

            let imagePath = existing.image;

            if (req.file) {
                deleteImageFile(existing.image);
                imagePath = `uploads/products/${req.file.filename}`;
            } else if (removeImage === 'true') {
                deleteImageFile(existing.image);
                imagePath = null;
            }

            db.prepare(`
                UPDATE products SET name = ?, barcode = ?, price = ?, cost = ?, stock = ?, min_stock = ?, category = ?, brand = ?, image = ?
                WHERE id = ?
            `).run(
                parsed.name, parsed.barcode || null,
                parsed.price, parsed.cost,
                parsed.stock, parsed.minStock,
                parsed.category, parsed.brand,
                imagePath, req.params.id
            );

            res.json({
                id: req.params.id,
                ...parsed,
                image: imagePath || '',
            });
        } catch (error) {
            if (req.file) deleteImageFile(`uploads/products/${req.file.filename}`);
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// ─── PATCH /api/products/:id/stock — Update stock only ────
router.patch('/:id/stock', (req, res) => {
    try {
        const stock = toNonNegativeNumber(req.body.stock);
        if (stock === null) {
            return res.status(400).json({ error: 'Stock inválido' });
        }

        const result = db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── DELETE /api/products/:id — Delete product + image ────
router.delete('/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT image FROM products WHERE id = ?').get(req.params.id);
        const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (existing) deleteImageFile(existing.image);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── DELETE /api/products/:id/image — Remove image only ───
router.delete('/:id/image', (req, res) => {
    try {
        const existing = db.prepare('SELECT image FROM products WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Product not found' });
        }
        deleteImageFile(existing.image);
        db.prepare('UPDATE products SET image = NULL WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
