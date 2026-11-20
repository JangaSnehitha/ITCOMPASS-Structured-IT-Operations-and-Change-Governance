// src/routes/users.js
import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole, createUser } from '../middleware/auth.js';

const router = express.Router();

/** List all users (admin/manager) */
router.get('/', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const rows = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
  res.json(rows);
});

/** Create a user (admin only) – delegates to auth register but returns list-friendly data */
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  const valid = ['admin', 'manager', 'implementer', 'requester'];
  if (!valid.includes(role)) return res.status(400).json({ error: `Invalid role. Must be one of: ${valid.join(', ')}` });
  try {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return res.status(409).json({ error: 'Username already exists' });
    const userId = await createUser({ username, password, role });
    res.status(201).json({ id: userId, username, role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
