import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { approvalSequence } from '../stateMachine.js';

const router = express.Router();

function audit(entity, entityId, action, performedBy, details = null) {
  db.prepare(`
    INSERT INTO audit_log
      (entity, entity_id, action, performed_by, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    entity,
    entityId,
    action,
    performedBy,
    details ? JSON.stringify(details) : null
  );
}

function getRequest(id) {
  return db.prepare(
    'SELECT * FROM change_requests WHERE id = ?'
  ).get(id);
}

function validateRequestId(id) {
  return /^[1-9]\d*$/.test(id);
}

// APPROVE
router.post('/:id/approve', requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!validateRequestId(id)) {
    return res.status(400).json({ error: 'Invalid request ID' });
  }

  const changeRequest = getRequest(id);

  if (!changeRequest) {
    return res.status(404).json({ error: 'Request not found' });
  }

  if (changeRequest.created_by === userId) {
    return res.status(403).json({
      error: 'Cannot approve your own request'
    });
  }

  if (!approvalSequence.includes(userRole)) {
    return res.status(403).json({
      error: 'Your role is not part of the approval chain'
    });
  }

  if (!['SUBMITTED', 'PENDING_APPROVAL'].includes(changeRequest.status)) {
    return res.status(400).json({
      error: `Cannot approve request in status ${changeRequest.status}`
    });
  }

  // Enforce Manager -> Admin order.
  if (userRole === 'admin') {
    const managerApproved = db.prepare(`
      SELECT a.id
      FROM approvals a
      JOIN users u ON u.id = a.approver_id
      WHERE a.request_id = ?
        AND u.role = 'manager'
        AND a.decision = 'APPROVED'
    `).get(id);

    if (!managerApproved) {
      return res.status(403).json({
        error: 'Manager must approve before admin can approve'
      });
    }
  }

  // Prevent duplicate approval by the same role.
  const existingRoleApproval = db.prepare(`
    SELECT a.id
    FROM approvals a
    JOIN users u ON u.id = a.approver_id
    WHERE a.request_id = ?
      AND u.role = ?
  `).get(id, userRole);

  if (existingRoleApproval) {
    return res.status(400).json({
      error: 'This approval stage has already been completed'
    });
  }

  try {
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO approvals (request_id, approver_id, decision)
        VALUES (?, ?, 'APPROVED')
      `).run(id, userId);

      audit('approvals', id, 'APPROVE', userId, {
        role: userRole
      });

      const approvedRoles = db.prepare(`
        SELECT DISTINCT u.role
        FROM approvals a
        JOIN users u ON u.id = a.approver_id
        WHERE a.request_id = ?
          AND a.decision = 'APPROVED'
      `).all(id).map(row => row.role);

      const allApproved = approvalSequence.every(role =>
        approvedRoles.includes(role)
      );

      if (allApproved) {
        db.prepare(`
          UPDATE change_requests
          SET status = 'APPROVED',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(id);

        audit(
          'change_requests',
          id,
          'STATUS_CHANGE',
          userId,
          {
            from: changeRequest.status,
            to: 'APPROVED'
          }
        );
      } else if (changeRequest.status !== 'PENDING_APPROVAL') {
        db.prepare(`
          UPDATE change_requests
          SET status = 'PENDING_APPROVAL',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(id);

        audit(
          'change_requests',
          id,
          'STATUS_CHANGE',
          userId,
          {
            from: changeRequest.status,
            to: 'PENDING_APPROVAL'
          }
        );
      }
    });

    transaction();

    return res.json({ message: 'Request approved successfully' });
  } catch (error) {
    console.error('Approval error:', error);

    return res.status(500).json({
      error: 'Approval processing failed'
    });
  }
});

// REJECT
router.post('/:id/reject', requireAuth, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!validateRequestId(id)) {
    return res.status(400).json({ error: 'Invalid request ID' });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      error: 'Rejection reason required'
    });
  }

  const changeRequest = getRequest(id);

  if (!changeRequest) {
    return res.status(404).json({ error: 'Request not found' });
  }

  if (changeRequest.created_by === userId) {
    return res.status(403).json({
      error: 'Owner cannot reject their own request'
    });
  }

  if (!approvalSequence.includes(userRole)) {
    return res.status(403).json({
      error: 'Your role is not part of the approval chain'
    });
  }

  if (!['SUBMITTED', 'PENDING_APPROVAL'].includes(changeRequest.status)) {
    return res.status(400).json({
      error: `Cannot reject request in status ${changeRequest.status}`
    });
  }

  // Admin can reject only after manager approval.
  if (userRole === 'admin') {
    const managerApproved = db.prepare(`
      SELECT a.id
      FROM approvals a
      JOIN users u ON u.id = a.approver_id
      WHERE a.request_id = ?
        AND u.role = 'manager'
        AND a.decision = 'APPROVED'
    `).get(id);

    if (!managerApproved) {
      return res.status(403).json({
        error: 'Manager must approve before admin can reject'
      });
    }
  }

  const existingDecision = db.prepare(`
    SELECT a.id
    FROM approvals a
    JOIN users u ON u.id = a.approver_id
    WHERE a.request_id = ?
      AND u.role = ?
  `).get(id, userRole);

  if (existingDecision) {
    return res.status(400).json({
      error: 'This approval stage has already been completed'
    });
  }

  try {
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO approvals
          (request_id, approver_id, decision, comment)
        VALUES (?, ?, 'REJECTED', ?)
      `).run(id, userId, reason.trim());

      audit('approvals', id, 'REJECT', userId, {
        reason: reason.trim(),
        role: userRole
      });

      db.prepare(`
        UPDATE change_requests
        SET status = 'REJECTED',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(id);

      audit(
        'change_requests',
        id,
        'STATUS_CHANGE',
        userId,
        {
          from: changeRequest.status,
          to: 'REJECTED'
        }
      );
    });

    transaction();

    return res.json({ message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Rejection error:', error);

    return res.status(500).json({
      error: 'Rejection processing failed'
    });
  }
});

export default router;