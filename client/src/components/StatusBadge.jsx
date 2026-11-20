export default function StatusBadge({ status }) {
  const map = {
    DRAFT: 'badge-draft',
    SUBMITTED: 'badge-submitted',
    PENDING_APPROVAL: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CANCELLED: 'badge-cancelled',
    IMPLEMENTING: 'badge-implementing',
    IMPLEMENTED: 'badge-implemented',
    FAILED: 'badge-failed',
    ROLLED_BACK: 'badge-rolled-back',
  };

  const labels = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    IMPLEMENTING: 'Implementing',
    IMPLEMENTED: 'Implemented',
    FAILED: 'Failed',
    ROLLED_BACK: 'Rolled Back',
  };

  return (
    <span className={`badge ${map[status] || 'badge-draft'}`}>
      {labels[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const map = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' };
  return <span className={`badge ${map[priority] || ''}`}>⚡ {priority}</span>;
}

export function RiskBadge({ risk }) {
  const map = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' };
  return <span className={`badge ${map[risk] || ''}`}>{risk} Risk</span>;
}
