import { useState, useEffect } from 'react';
import { getRequests, getRequestApprovals, approveRequest, rejectRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import Modal from '../components/Modal';
import { Search, Check, X, MessageSquare, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const STAGES = ['manager', 'admin'];

function ApprovalTimeline({ approvals }) {
  const approvedRoles = (approvals || []).filter(a => a.decision === 'APPROVED').map(a => a.approver_role);
  const getStageStatus = (role) => {
    if (approvedRoles.includes(role)) return 'completed';
    const idx = STAGES.indexOf(role);
    const prevDone = idx === 0 || approvedRoles.includes(STAGES[idx - 1]);
    if (prevDone && !approvedRoles.includes(role)) return 'current';
    return 'pending';
  };

  return (
    <div className="approval-timeline">
      {STAGES.map((role, i) => {
        const status = getStageStatus(role);
        const approval = (approvals || []).find(a => a.approver_role === role && a.decision === 'APPROVED');
        return (
          <div key={role} style={{ display: 'contents' }}>
            <div className="approval-step">
              <div className={`approval-step-icon ${status}`}>
                {status === 'completed' ? <Check size={16} /> : i + 1}
              </div>
              <div className="approval-step-info">
                <div className="approval-step-label" style={{ textTransform: 'capitalize' }}>{role}</div>
                <div className="approval-step-detail">
                  {status === 'completed' ? approval?.approver_name || 'Approved' :
                   status === 'current' ? 'Awaiting' : '—'}
                </div>
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`approval-step-line ${status === 'completed' ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
      <div className="approval-step-line" style={{ background: approvedRoles.length === STAGES.length ? 'var(--green-500)' : undefined }} />
      <div className="approval-step">
        <div className={`approval-step-icon ${approvedRoles.length === STAGES.length ? 'completed' : 'pending'}`}>
          {approvedRoles.length === STAGES.length ? <CheckCircle size={16} /> : '✓'}
        </div>
        <div className="approval-step-info">
          <div className="approval-step-label">Approved</div>
          <div className="approval-step-detail">{approvedRoles.length === STAGES.length ? 'Complete' : 'Final'}</div>
        </div>
      </div>
    </div>
  );
}

function getWaitingDays(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [approvalsMap, setApprovalsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('oldest');
  const [modal, setModal] = useState(null); // { type: 'approve'|'reject', request }
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getRequests();
      const all = res.data;
      setRequests(all);
      // Load approvals for pending/submitted items
      const pending = all.filter(r => ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(r.status));
      const map = {};
      await Promise.all(pending.map(async (r) => {
        try {
          const a = await getRequestApprovals(r.id);
          map[r.id] = a.data;
        } catch { map[r.id] = []; }
      }));
      setApprovalsMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = requests.filter(r => {
    if (tab === 'pending') return ['SUBMITTED', 'PENDING_APPROVAL'].includes(r.status);
    if (tab === 'approved') return r.status === 'APPROVED';
    if (tab === 'rejected') return r.status === 'REJECTED';
    return true;
  }).filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || String(r.id).includes(search)
  );

  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'oldest'
      ? new Date(a.created_at) - new Date(b.created_at)
      : new Date(b.created_at) - new Date(a.created_at)
  );

  const pendingCount = requests.filter(r => ['SUBMITTED', 'PENDING_APPROVAL'].includes(r.status)).length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;
  const allCount = requests.length;

  const donutData = [
    { name: 'Pending', value: pendingCount, color: '#eab308' },
    { name: 'Approved', value: approvedCount, color: '#22c55e' },
    { name: 'Rejected', value: rejectedCount, color: '#ef4444' },
  ].filter(d => d.value > 0);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  const riskPending = requests.filter(r => ['SUBMITTED', 'PENDING_APPROVAL'].includes(r.status));
  const riskLow = riskPending.filter(r => r.risk === 'Low').length;
  const riskMed = riskPending.filter(r => r.risk === 'Medium').length;
  const riskHigh = riskPending.filter(r => r.risk === 'High').length;

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await approveRequest(modal.request.id, comment);
      setToast({ type: 'success', message: 'Request approved successfully' });
      setModal(null);
      setComment('');
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Approval failed' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) { setToast({ type: 'error', message: 'Rejection reason is required' }); return; }
    setProcessing(true);
    try {
      await rejectRequest(modal.request.id, comment);
      setToast({ type: 'success', message: 'Request rejected' });
      setModal(null);
      setComment('');
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Rejection failed' });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        </div>
      )}

      <div className="page-header-actions">
        <div className="page-header">
          <h1>Approvals</h1>
          <p>Review and approve IT change requests awaiting your decision.</p>
        </div>
        <button className="btn btn-outline" onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}>
          Review {sortOrder === 'oldest' ? 'oldest' : 'newest'} first
        </button>
      </div>

      <div className="filter-tabs">
        <button className={`filter-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending ({pendingCount})
        </button>
        <button className={`filter-tab ${tab === 'approved' ? 'active' : ''}`} onClick={() => setTab('approved')}>
          Approved ({approvedCount})
        </button>
        <button className={`filter-tab ${tab === 'rejected' ? 'active' : ''}`} onClick={() => setTab('rejected')}>
          Rejected ({rejectedCount})
        </button>
        <button className={`filter-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All ({allCount})
        </button>
      </div>

      <div className="cards-grid-3">
        {/* Approval Status donut */}
        <div className="card">
          <div className="card-header"><h3>Approval Status</h3></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 100, height: 100, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData.length ? donutData : [{ name: 'None', value: 1, color: '#e5e7eb' }]}
                    cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" stroke="none">
                    {(donutData.length ? donutData : [{ color: '#e5e7eb' }]).map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{donutTotal > 0 ? Math.round((pendingCount / donutTotal) * 100) : 0}%</div>
              </div>
            </div>
            <div className="chart-legend">
              <div className="chart-legend-item"><span className="chart-legend-dot" style={{ background: '#eab308' }} /><span className="chart-legend-label">Pending</span><span className="chart-legend-value">{pendingCount}</span></div>
              <div className="chart-legend-item"><span className="chart-legend-dot" style={{ background: '#22c55e' }} /><span className="chart-legend-label">Approved</span><span className="chart-legend-value">{approvedCount}</span></div>
              <div className="chart-legend-item"><span className="chart-legend-dot" style={{ background: '#ef4444' }} /><span className="chart-legend-label">Rejected</span><span className="chart-legend-value">{rejectedCount}</span></div>
            </div>
          </div>
          <div style={{ padding: '0 24px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {pendingCount} require your action
          </div>
        </div>

        {/* Pending by Risk */}
        <div className="card">
          <div className="card-header"><h3>Pending Changes by Risk</h3></div>
          <div className="card-body">
            {[
              { label: 'Low', value: riskLow, color: 'var(--green-500)', bg: 'var(--green-100)' },
              { label: 'Medium', value: riskMed, color: 'var(--orange-500)', bg: 'var(--orange-100)' },
              { label: 'High', value: riskHigh, color: 'var(--red-500)', bg: 'var(--red-100)' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.label} Risk</span>
                  <span style={{ fontWeight: 600 }}>{r.value}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: r.bg }}>
                  <div style={{ height: '100%', borderRadius: 4, background: r.color, width: `${pendingCount > 0 ? (r.value / pendingCount) * 100 : 0}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* This Session */}
        <div className="card">
          <div className="card-header"><h3>This Session</h3></div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 13, marginBottom: 16 }}>
              <span>Approved</span><span>Remaining</span>
            </div>
            <div style={{ width: 90, height: 90, borderRadius: '50%', border: '6px solid var(--green-100)', borderTopColor: 'var(--green-500)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{approvedCount > 0 && pendingCount + approvedCount > 0 ? Math.round(approvedCount / (pendingCount + approvedCount) * 100) : 0}%</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 22, fontWeight: 700 }}>
              <span>{approvedCount}</span><span>{pendingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input placeholder="Search by name, ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="sort-select" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
          <option value="oldest">Wait time (Longest)</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      {/* Approval Cards */}
      {sorted.length === 0 && (
        <div className="empty-state"><CheckCircle /><h3>No requests</h3><p>No change requests match your filter.</p></div>
      )}

      {sorted.map(req => {
        const approvals = approvalsMap[req.id] || [];
        const initials = (req.requester_name || 'U').slice(0, 2).toUpperCase();
        const canApprove = ['SUBMITTED', 'PENDING_APPROVAL'].includes(req.status) && req.created_by !== user?.id && ['manager', 'admin'].includes(user?.role);

        return (
          <div className="approval-card" key={req.id}>
            <div className="approval-card-top">
              <div className="approval-avatar">{initials}</div>
              <div className="approval-card-info">
                <div className="approval-card-title">
                  {req.title}
                  <PriorityBadge priority={req.priority} />
                </div>
                <div className="approval-card-meta">
                  <span>{req.requester_name}</span>
                  <span>{req.service_name}</span>
                  <span>{new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="approval-card-right">
                <div className="approval-card-id">CR-{String(req.id).padStart(4, '0')}</div>
                <div className="approval-card-waiting">Waiting: {getWaitingDays(req.created_at)}</div>
                <div style={{ marginTop: 4 }}><StatusBadge status={req.status} /></div>
              </div>
            </div>

            {req.description && (
              <div className="approval-card-desc">{req.description.slice(0, 180)}{req.description.length > 180 ? '...' : ''}</div>
            )}

            <ApprovalTimeline approvals={approvals} />

            {canApprove && (
              <div className="approval-actions">
                <button className="btn btn-success" onClick={() => { setModal({ type: 'approve', request: req }); setComment(''); }}>
                  <Check size={16} /> Approve
                </button>
                <button className="btn btn-danger" onClick={() => { setModal({ type: 'reject', request: req }); setComment(''); }}>
                  <X size={16} /> Reject
                </button>
                <button className="btn btn-outline" disabled>
                  <MessageSquare size={16} /> Request Changes
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Approve/Reject Modal */}
      <Modal
        open={!!modal}
        onClose={() => { setModal(null); setComment(''); }}
        title={modal?.type === 'approve' ? 'Approve Change Request' : 'Reject Change Request'}
        subtitle={modal?.request?.title}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModal(null); setComment(''); }}>Cancel</button>
            <button
              className={`btn ${modal?.type === 'approve' ? 'btn-success' : 'btn-danger'}`}
              style={modal?.type === 'reject' ? { background: 'var(--red-600)', color: 'white', borderColor: 'var(--red-600)' } : {}}
              onClick={modal?.type === 'approve' ? handleApprove : handleReject}
              disabled={processing}
            >
              {processing ? 'Processing...' : modal?.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">
            {modal?.type === 'approve' ? 'Comments (optional)' : 'Rejection reason (required)'}
          </label>
          <textarea className="form-textarea" rows={4} value={comment} onChange={e => setComment(e.target.value)}
            placeholder={modal?.type === 'approve' ? 'Add any comments...' : 'Explain why this request is being rejected...'} />
        </div>
      </Modal>
    </>
  );
}
