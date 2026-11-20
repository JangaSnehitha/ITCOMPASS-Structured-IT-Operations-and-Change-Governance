import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRequest, getRequestApprovals, getRequestAudit, updateRequest, cancelRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { PriorityBadge, RiskBadge } from '../components/StatusBadge';
import Modal from '../components/Modal';
import { ArrowLeft, Check, Clock, AlertTriangle, XCircle, User, Calendar, FileText, History } from 'lucide-react';

const LIFECYCLE = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'IMPLEMENTING', 'IMPLEMENTED'];
const FAIL_STATES = { REJECTED: 'rejected', CANCELLED: 'cancelled', FAILED: 'failed', ROLLED_BACK: 'rolled_back' };

function LifecycleTimeline({ status }) {
  const idx = LIFECYCLE.indexOf(status);
  const isFail = Object.keys(FAIL_STATES).includes(status);

  return (
    <div className="lifecycle-timeline">
      {LIFECYCLE.map((step, i) => {
        const done = idx >= 0 && i < idx;
        const current = idx >= 0 && i === idx;
        return (
          <div key={step} style={{ display: 'contents' }}>
            <div className="lifecycle-step">
              <div className={`lifecycle-dot ${done ? 'active' : current ? 'current' : ''}`}>
                {done ? <Check size={14} /> : ''}
              </div>
              <div className={`lifecycle-label ${done || current ? 'active' : ''}`}>
                {step.replace(/_/g, ' ')}
              </div>
            </div>
            {i < LIFECYCLE.length - 1 && <div className={`lifecycle-line ${done ? 'active' : ''}`} />}
          </div>
        );
      })}
      {isFail && (
        <>
          <div className="lifecycle-line" />
          <div className="lifecycle-step">
            <div className="lifecycle-dot failed"><XCircle size={14} /></div>
            <div className="lifecycle-label active">{status.replace(/_/g, ' ')}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, a, au] = await Promise.all([getRequest(id), getRequestApprovals(id), getRequestAudit(id)]);
      setRequest(r.data);
      setApprovals(a.data);
      setAudit(au.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSubmit = async () => {
    try {
      await updateRequest(id, { status: 'SUBMITTED' });
      setToast({ type: 'success', message: 'Request submitted for approval' });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to submit' });
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    try {
      await cancelRequest(id, cancelReason);
      setToast({ type: 'success', message: 'Request cancelled' });
      setCancelModal(false);
      setCancelReason('');
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Cancellation failed' });
    }
  };

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!request) return <div className="empty-state"><h3>Request not found</h3></div>;

  const isOwner = request.created_by === user?.id;
  const canSubmit = isOwner && request.status === 'DRAFT';
  const canCancel = isOwner && !['IMPLEMENTED', 'FAILED', 'ROLLED_BACK', 'CANCELLED', 'REJECTED'].includes(request.status);

  return (
    <>
      {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.message}</div></div>}

      <button className="btn btn-ghost" onClick={() => navigate('/requests')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Change Requests
      </button>

      <div className="page-header-actions">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1>CR-{String(request.id).padStart(4, '0')}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p style={{ marginTop: 4 }}>{request.title}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canSubmit && <button className="btn btn-primary" onClick={handleSubmit}>Submit for Approval</button>}
          {canCancel && <button className="btn btn-danger" onClick={() => setCancelModal(true)}>Cancel Request</button>}
        </div>
      </div>

      {/* Lifecycle */}
      <div className="card" style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="card-header"><h3>Request Lifecycle</h3></div>
        <div className="card-body">
          <LifecycleTimeline status={request.status} />
        </div>
      </div>

      <div className="cards-grid-2">
        {/* Details */}
        <div className="card">
          <div className="card-header"><h3>Request Details</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                { icon: <User size={16} />, label: 'Requester', value: request.requester_name || `User #${request.created_by}` },
                { icon: <FileText size={16} />, label: 'Service', value: request.service_name || `Service #${request.service_id}` },
                { icon: <AlertTriangle size={16} />, label: 'Priority', value: <PriorityBadge priority={request.priority} /> },
                { icon: <AlertTriangle size={16} />, label: 'Risk', value: <RiskBadge risk={request.risk} /> },
                { icon: <AlertTriangle size={16} />, label: 'Impact', value: <span className={`badge badge-${request.impact.toLowerCase()}`}>{request.impact} Impact</span> },
                { icon: <Calendar size={16} />, label: 'Planned Start', value: request.planned_start ? new Date(request.planned_start).toLocaleString() : '—' },
                { icon: <Calendar size={16} />, label: 'Planned End', value: request.planned_end ? new Date(request.planned_end).toLocaleString() : '—' },
                { icon: <Clock size={16} />, label: 'Created', value: new Date(request.created_at).toLocaleString() },
                { icon: <Clock size={16} />, label: 'Updated', value: new Date(request.updated_at).toLocaleString() },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 100 }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Approvals */}
        <div className="card">
          <div className="card-header"><h3>Approval History</h3></div>
          <div className="card-body">
            {approvals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No approvals yet</div>
            ) : (
              approvals.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div className={`approval-step-icon ${a.decision === 'APPROVED' ? 'completed' : ''}`}
                    style={a.decision === 'REJECTED' ? { background: 'var(--red-500)', color: 'white' } : {}}>
                    {a.decision === 'APPROVED' ? <Check size={14} /> : '✗'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 550 }}>{a.approver_name} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'capitalize' }}>({a.approver_role})</span></div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(a.decided_at).toLocaleString()}</div>
                    {a.comment && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{a.comment}</div>}
                  </div>
                  <StatusBadge status={a.decision} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {request.description && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>Description & Plans</h3></div>
          <div className="card-body">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-family)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {request.description}
            </pre>
          </div>
        </div>
      )}

      {request.cancellation_reason && (
        <div className="card" style={{ marginTop: 20, borderLeft: '4px solid var(--red-500)' }}>
          <div className="card-header"><h3>Cancellation Reason</h3></div>
          <div className="card-body"><p style={{ color: 'var(--text-secondary)' }}>{request.cancellation_reason}</p></div>
        </div>
      )}

      {/* Audit */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3><History size={16} style={{ marginRight: 8 }} />Audit History</h3></div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Action</th><th>User</th><th>Timestamp</th><th>Details</th></tr>
            </thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.id}>
                  <td><span className="badge badge-submitted">{a.action}</span></td>
                  <td>{a.performed_by_name || `User #${a.performed_by}`}</td>
                  <td className="cell-secondary">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="cell-secondary" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.details}</td>
                </tr>
              ))}
              {audit.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No audit records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Change Request"
        subtitle="This action cannot be undone."
        footer={<>
          <button className="btn btn-outline" onClick={() => setCancelModal(false)}>Keep Request</button>
          <button className="btn btn-danger" style={{ background: 'var(--red-600)', color: 'white', borderColor: 'var(--red-600)' }} onClick={handleCancel}>Confirm Cancellation</button>
        </>}>
        <div className="form-group">
          <label className="form-label">Cancellation Reason *</label>
          <textarea className="form-textarea" rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Why is this request being cancelled?" />
        </div>
      </Modal>
    </>
  );
}
