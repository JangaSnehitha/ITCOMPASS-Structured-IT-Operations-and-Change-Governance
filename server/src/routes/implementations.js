// src/routes/implementations.js
import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { canTransition } from '../stateMachine.js';

const router = express.Router();

function audit(db, entity, entityId, action, performedBy, details = null) {
  db.prepare('INSERT INTO audit_log (entity, entity_id, action, performed_by, details) VALUES (?,?,?,?,?)')
    .run(entity, entityId, action, performedBy, details ? JSON.stringify(details) : null);
}

/** List all implementations */
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT i.*, cr.title as request_title, cr.status as request_status,
    u.username as implementer_name, s.name as service_name
    FROM implementations i
    LEFT JOIN change_requests cr ON i.request_id = cr.id
    LEFT JOIN users u ON i.implementer_id = u.id
    LEFT JOIN services s ON cr.service_id = s.id
    ORDER BY i.start_time DESC`).all();
  res.json(rows);
});

/** Start implementation */
router.post('/', requireAuth, requireRole('admin', 'implementer'), (req, res) => {
  const { request_id, notes } = req.body;
  if (!request_id) return res.status(400).json({ error: 'request_id required' });

  const request = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(request_id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const transCheck = canTransition(request.status, 'IMPLEMENTING', { request });
  if (!transCheck.ok) return res.status(400).json({ error: transCheck.message });

  const tran = db.transaction(() => {
    const info = db.prepare('INSERT INTO implementations (request_id, implementer_id, notes) VALUES (?,?,?)')
      .run(request_id, req.user.id, notes || null);
    db.prepare('UPDATE change_requests SET status = ?, updated_at = datetime("now") WHERE id = ?')
      .run('IMPLEMENTING', request_id);
    audit(db, 'change_requests', request_id, 'STATUS_CHANGE', req.user.id, { from: request.status, to: 'IMPLEMENTING' });
    return info.lastInsertRowid;
  });

  try {
    const implId = tran();
    res.status(201).json({ id: implId, message: 'Implementation started' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to start implementation' });
  }
});

/** Complete implementation */
router.patch('/:id/complete', requireAuth, requireRole('admin', 'implementer'), (req, res) => {
  const { outcome, notes, rollback_required } = req.body;
  if (!outcome || !['SUCCESS', 'FAILURE'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be SUCCESS or FAILURE' });
  }

  const impl = db.prepare('SELECT * FROM implementations WHERE id = ?').get(req.params.id);
  if (!impl) return res.status(404).json({ error: 'Implementation not found' });

  const request = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(impl.request_id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const newStatus = outcome === 'SUCCESS' ? 'IMPLEMENTED' : 'FAILED';
  const transCheck = canTransition(request.status, newStatus, { request });
  if (!transCheck.ok) return res.status(400).json({ error: transCheck.message });

  const tran = db.transaction(() => {
    db.prepare('UPDATE implementations SET end_time = datetime("now"), outcome = ?, notes = ?, rollback_required = ? WHERE id = ?')
      .run(outcome, notes || impl.notes, rollback_required ? 1 : 0, req.params.id);
    db.prepare('UPDATE change_requests SET status = ?, updated_at = datetime("now") WHERE id = ?')
      .run(newStatus, impl.request_id);
    audit(db, 'change_requests', impl.request_id, 'STATUS_CHANGE', req.user.id, { from: request.status, to: newStatus, outcome });
  });

  try {
    tran();
    res.json({ message: `Implementation completed: ${outcome}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to complete implementation' });
  }
});

/** Rollback a failed implementation */
router.post('/:requestId/rollback', requireAuth, requireRole('admin', 'implementer'), (req, res) => {
  const { notes } = req.body;
  const request = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const transCheck = canTransition(request.status, 'ROLLED_BACK', { request });
  if (!transCheck.ok) return res.status(400).json({ error: transCheck.message });

  const tran = db.transaction(() => {
    db.prepare('UPDATE change_requests SET status = ?, updated_at = datetime("now") WHERE id = ?')
      .run('ROLLED_BACK', req.params.requestId);
    audit(db, 'change_requests', req.params.requestId, 'ROLLBACK', req.user.id, { notes });
  });

  try {
    tran();
    res.json({ message: 'Rolled back' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Rollback failed' });
  }
});

export default router;
