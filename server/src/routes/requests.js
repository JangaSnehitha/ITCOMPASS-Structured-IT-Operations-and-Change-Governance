// src/routes/requests.js
import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { canTransition, approvalSequence } from '../stateMachine.js';

const router = express.Router();

// Helper to record audit entries
function audit(db, entity, entityId, action, performedBy, details = null) {
  const stmt = db.prepare('INSERT INTO audit_log (entity, entity_id, action, performed_by, details) VALUES (?,?,?,?,?)');
  stmt.run(entity, entityId, action, performedBy, details ? JSON.stringify(details) : null);
}

/** LIST all change requests */
router.get('/', requireAuth, (req, res) => {
  let rows;
  if (['admin', 'manager'].includes(req.user.role)) {
    rows = db.prepare(`SELECT cr.*, u.username as requester_name, s.name as service_name
      FROM change_requests cr
      LEFT JOIN users u ON cr.created_by = u.id
      LEFT JOIN services s ON cr.service_id = s.id
      ORDER BY cr.created_at DESC`).all();
  } else {
    rows = db.prepare(`SELECT cr.*, u.username as requester_name, s.name as service_name
      FROM change_requests cr
      LEFT JOIN users u ON cr.created_by = u.id
      LEFT JOIN services s ON cr.service_id = s.id
      WHERE cr.created_by = ?
      ORDER BY cr.created_at DESC`).all(req.user.id);
  }
  res.json(rows);
});

/** GET audit history for a specific request */
router.get('/:id/audit', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT al.*, u.username as performed_by_name
    FROM audit_log al
    LEFT JOIN users u ON al.performed_by = u.id
    WHERE al.entity_id = ? AND al.entity IN ('change_requests','approvals')
    ORDER BY al.timestamp DESC`).all(req.params.id);
  res.json(rows);
});

/** GET approvals for a specific request */
router.get('/:id/approvals', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT a.*, u.username as approver_name, u.role as approver_role
    FROM approvals a
    LEFT JOIN users u ON a.approver_id = u.id
    WHERE a.request_id = ?
    ORDER BY a.decided_at ASC`).all(req.params.id);
  res.json(rows);
});

/** CREATE a new change request (status DRAFT) */
router.post('/', requireAuth, (req, res) => {
  const { title, description, service_id, priority, risk, impact, planned_start, planned_end } = req.body;
  if (!title || !service_id || !priority || !risk || !impact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(`INSERT INTO change_requests 
    (title, description, service_id, priority, risk, impact, planned_start, planned_end, status, created_by) 
    VALUES (?,?,?,?,?,?,?,?, 'DRAFT', ?)`);
  const info = stmt.run(title, description, service_id, priority, risk, impact, planned_start, planned_end, req.user.id);
  audit(db, 'change_requests', info.lastInsertRowid, 'CREATE', req.user.id, { title, status: 'DRAFT' });
  res.status(201).json({ id: info.lastInsertRowid });
});

/** READ a request */
router.get('/:id', requireAuth, (req, res) => {
  const stmt = db.prepare('SELECT * FROM change_requests WHERE id = ?');
  const request = stmt.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.created_by !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(request);
});

/** UPDATE a request – allow status changes with validation */
router.put('/:id', requireAuth, (req, res) => {
  const getStmt = db.prepare('SELECT * FROM change_requests WHERE id = ?');
  const request = getStmt.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.created_by !== req.user.id) return res.status(403).json({ error: 'Only owner can modify' });

  const { title, description, service_id, priority, risk, impact, planned_start, planned_end, status } = req.body;

  // Disallow modifications if request is in a terminal state
  const terminalStates = ['REJECTED', 'CANCELLED', 'IMPLEMENTING', 'FAILED', 'ROLLED_BACK', 'APPROVED'];
  if (terminalStates.includes(request.status)) {
    return res.status(400).json({ error: `Cannot modify a request in status ${request.status}` });
  }
  // For APPROVED status allow only status changes (workflow), block other field edits
  if (request.status === 'APPROVED') {
    const allowedFields = ['status'];
    const disallowed = Object.keys(req.body).filter(k => !allowedFields.includes(k));
    if (disallowed.length) {
      return res.status(400).json({ error: `Cannot modify fields ${disallowed.join(', ')} on an APPROVED request` });
    }
  }

  // Validate status transition if provided
  if (status && status !== request.status) {
    const transCheck = canTransition(request.status, status, { request });
    if (!transCheck.ok) return res.status(400).json({ error: transCheck.message });
  }

  const updStmt = db.prepare(`UPDATE change_requests SET 
    title = COALESCE(?, title),
    description = COALESCE(?, description),
    service_id = COALESCE(?, service_id),
    priority = COALESCE(?, priority),
    risk = COALESCE(?, risk),
    impact = COALESCE(?, impact),
    planned_start = COALESCE(?, planned_start),
    planned_end = COALESCE(?, planned_end),
    status = COALESCE(?, status),
    updated_at = datetime('now')
    WHERE id = ?`);
  updStmt.run(title, description, service_id, priority, risk, impact, planned_start, planned_end, status, req.params.id);

  if (status && status !== request.status) {
    audit(db, 'change_requests', req.params.id, 'STATUS_CHANGE', req.user.id, { from: request.status, to: status });
  }
  audit(db, 'change_requests', req.params.id, 'UPDATE', req.user.id, { fields: Object.keys(req.body) });
  res.json({ message: 'Updated' });
});

/** CANCEL (soft‑delete) a request – only if not already implemented */


// Cancel (soft‑delete) a request – only if not implemented
router.delete('/:id', requireAuth, (req, res) => {
  const requestId = req.params.id;
  const request = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.created_by !== req.user.id) return res.status(403).json({ error: 'Only owner can cancel' });
  if (['IMPLEMENTING', 'IMPLEMENTED', 'CANCELLED', 'REJECTED'].includes(request.status)) {
    return res.status(400).json({
      error: `Cannot cancel request in status ${request.status}`
    });

  }
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Cancellation reason required' });
  const tran = db.transaction(() => {
    db.prepare("UPDATE change_requests SET status = ?, cancellation_reason = ?, updated_at = datetime('now') WHERE id = ?")
      .run('CANCELLED', reason, requestId);
    audit(db, 'change_requests', requestId, 'CANCEL', req.user.id, { reason });
  });
  try {
    tran();
    res.json({ message: 'Cancelled' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

export default router;
