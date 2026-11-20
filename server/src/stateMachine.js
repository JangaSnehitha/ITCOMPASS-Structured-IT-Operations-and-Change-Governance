// src/stateMachine.js
/**
 * Centralized state‑machine for change request lifecycle.
 * Valid statuses (from schema):
 *   DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED,
 *   IMPLEMENTING, IMPLEMENTED, FAILED, ROLLED_BACK, CANCELLED.
 *
 * The function `canTransition(current, next, ctx)` returns an object:
 *   { ok: boolean, message?: string }
 * where `ctx` can contain extra information such as the request record,
 * approvedCount, requiredSequence, etc.
 */

const approvalSequence = ["manager", "admin"]; // sequential roles required

function canTransition(current, next, ctx = {}) {
  // Helper for simple equality
  const eq = (a, b) => a === b;

  // Disallow any transition from terminal states (except cancellation)
  const terminal = ["REJECTED", "FAILED", "IMPLEMENTED", "ROLLED_BACK", "CANCELLED"];
  if (terminal.includes(current) && next !== current) {
    return { ok: false, message: `Cannot transition from terminal state ${current}` };
  }

  // Define allowed transitions
  const allowed = {
    DRAFT: ["SUBMITTED", "PENDING_APPROVAL"],
    SUBMITTED: ["PENDING_APPROVAL", "REJECTED", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["IMPLEMENTING", "CANCELLED"],
    IMPLEMENTING: ["IMPLEMENTED", "FAILED", "CANCELLED"],
    FAILED: ["ROLLED_BACK"],
    IMPLEMENTED: [],
    REJECTED: [],
    ROLLED_BACK: [],
    CANCELLED: []
  };

  if (!allowed[current]?.includes(next)) {
    return { ok: false, message: `Invalid transition ${current} → ${next}` };
  }

  // Additional business rules based on context
  if (next === "APPROVED") {
    // All approvals in the required sequence must be satisfied
    const { approvals = [] } = ctx;
    // Build set of roles that have approved
    const approvedRoles = approvals.map(a => a.role);
    // Ensure the sequence is a prefix of approvedRoles
    for (let i = 0; i < approvalSequence.length; i++) {
      if (!approvedRoles.includes(approvalSequence[i])) {
        return { ok: false, message: `Missing approval from role ${approvalSequence[i]}` };
      }
    }
  }

  if (next === "IMPLEMENTING") {
    const { request } = ctx;
    if (!request.planned_start || !request.planned_end) {
      return { ok: false, message: "Schedule must be set before implementation" };
    }
  }

  return { ok: true };
}

export { canTransition, approvalSequence };
