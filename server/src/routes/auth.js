// src/routes/auth.js
import express from 'express';
import db from '../db.js';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, createUser } from '../middleware/auth.js';

const router = express.Router();

// Register a new user (admin only)
router.post('/register', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
    const exists = stmt.get(username);
    if (exists) return res.status(409).json({ error: 'Username already exists' });

    const userId = await createUser({ username, password, role });
    res.status(201).json({ id: userId, username, role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const stmt = db.prepare('SELECT id, password_hash FROM users WHERE username = ?');
  const user = stmt.get(username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid username or password' });
  // set session
  req.session.userId = user.id;
  res.json({ message: 'Logged in' });
});

// Logout
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// Get current user info
router.get('/me', requireAuth, (req, res) => {
  const { id, username, role } = req.user;
  res.json({ id, username, role });
});

export default router;
