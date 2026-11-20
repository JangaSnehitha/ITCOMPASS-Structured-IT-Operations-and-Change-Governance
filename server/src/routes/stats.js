// src/routes/stats.js
import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/** Dashboard statistics */
router.get('/dashboard', requireAuth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM change_requests').get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status IN ('SUBMITTED','PENDING_APPROVAL')").get().count;
  const approved = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'APPROVED'").get().count;
  const implemented = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'IMPLEMENTED'").get().count;
  const rejected = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'REJECTED'").get().count;
  const cancelled = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'CANCELLED'").get().count;
  const failed = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'FAILED'").get().count;
  const rolledBack = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'ROLLED_BACK'").get().count;
  const implementing = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'IMPLEMENTING'").get().count;
  const draft = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status = 'DRAFT'").get().count;

  // Risk distribution
  const lowRisk = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE risk = 'Low'").get().count;
  const medRisk = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE risk = 'Medium'").get().count;
  const highRisk = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE risk = 'High'").get().count;

  // Priority distribution
  const lowPri = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE priority = 'Low'").get().count;
  const medPri = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE priority = 'Medium'").get().count;
  const highPri = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE priority = 'High'").get().count;

  // Recent requests
  const recent = db.prepare(`SELECT cr.*, u.username as requester_name, s.name as service_name
    FROM change_requests cr
    LEFT JOIN users u ON cr.created_by = u.id
    LEFT JOIN services s ON cr.service_id = s.id
    ORDER BY cr.created_at DESC LIMIT 10`).all();

  res.json({
    total, pending, approved, implemented, rejected, cancelled, failed, rolledBack, implementing, draft,
    riskDistribution: { low: lowRisk, medium: medRisk, high: highRisk },
    priorityDistribution: { low: lowPri, medium: medPri, high: highPri },
    recent
  });
});

/** Audit log (admin only) */
router.get('/audit', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT al.*, u.username as performed_by_name
    FROM audit_log al
    LEFT JOIN users u ON al.performed_by = u.id
    ORDER BY al.timestamp DESC LIMIT 200`).all();
  res.json(rows);
});

export default router;
