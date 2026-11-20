// src/routes/services.js
import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

/** List all services */
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM services ORDER BY name').all();
  res.json(rows);
});

/** Create a service (admin only) */
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name required' });
  try {
    const info = db.prepare('INSERT INTO services (name, description) VALUES (?,?)').run(name, description || null);
    res.status(201).json({ id: info.lastInsertRowid, name, description });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Service already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
