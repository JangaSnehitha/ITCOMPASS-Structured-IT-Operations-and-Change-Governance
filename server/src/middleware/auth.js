// src/middleware/auth.js
import db from '../db.js';
import bcrypt from 'bcryptjs';

// Load user from session
export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    const stmt = db.prepare('SELECT id, username, role FROM users WHERE id = ?');
    const user = stmt.get(req.session.userId);
    if (user) {
      req.user = user;
      return next();
    }
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Role‑based guard (pass a list of allowed roles)
export function requireRole(...allowed) {
  return (req, res, next) => {
    if (req.user && allowed.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ error: 'Forbidden – insufficient role' });
  };
}

// Helper to create a new user (used by registration & admin)
export async function createUser({ username, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  // Insert or ignore if username already exists
  const stmt = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?,?,?)');
  const info = stmt.run(username, passwordHash, role);
  let userId = info.lastInsertRowid;
  if (info.changes === 0) {
    // User already exists, fetch its id
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    userId = existing.id;
  }
  // audit log
  db.prepare('INSERT INTO audit_log (entity, entity_id, action, performed_by, details) VALUES (?,?,?,?,?)')
    .run('users', userId, 'CREATE', null, JSON.stringify({ username, role }));
  return userId;
}
