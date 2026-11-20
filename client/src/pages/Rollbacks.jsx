import { useState, useEffect } from 'react';
import { getRequests, getImplementations, rollbackRequest } from '../services/api';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import Modal from '../components/Modal';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export default function Rollbacks() {
  const [requests, setRequests] = useState([]);
  const [implementations, setImplementations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, i] = await Promise.all([getRequests(), getImplementations()]);
      setRequests(r.data);
      setImplementations(i.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const failed = requests.filter(r => r.status === 'FAILED');
  const rolledBack = requests.filter(r => r.status === 'ROLLED_BACK');

  const handleRollback = async (req) => {
    setProcessing(true);
    try {
      await rollbackRequest(req.id, notes);
      setToast({ type: 'success', message: 'Rollback completed successfully' });
      setModal(null); setNotes('');
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Rollback failed' });
    } finally { setProcessing(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <h1>Rollbacks</h1>
        <p>Manage failed implementations requiring rollback.</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-label"><AlertTriangle size={16} /> Requiring Rollback</div>
          <div className="stat-card-value" style={{ color: 'var(--red-600)' }}>{failed.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><RotateCcw size={16} /> Rolled Back</div>
          <div className="stat-card-value" style={{ color: 'var(--orange-600)' }}>{rolledBack.length}</div>
        </div>
      </div>

      {failed.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ borderLeft: '4px solid var(--red-500)' }}>
            <h3>Failed – Requiring Rollback</h3>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Title</th><th>Service</th><th>Priority</th><th>Risk</th><th>Actions</th></tr></thead>
              <tbody>
                {failed.map(r => {
                  const impl = implementations.find(i => i.request_id === r.id);
                  return (
                    <tr key={r.id}>
                      <td className="cell-secondary">CR-{String(r.id).padStart(4, '0')}</td>
                      <td>
                        <div className="cell-title">{r.title}</div>
                        {impl?.notes && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Failure: {impl.notes}</div>}
                      </td>
                      <td className="cell-secondary">{r.service_name}</td>
                      <td><PriorityBadge priority={r.priority} /></td>
                      <td><span className={`badge badge-${r.risk.toLowerCase()}`}>{r.risk}</span></td>
                      <td>
                        <button className="btn btn-danger btn-sm" style={{ background: 'var(--orange-500)', color: 'white', borderColor: 'var(--orange-500)' }}
                          onClick={() => { setModal({ request: r }); setNotes(''); }}>
                          <RotateCcw size={14} /> Rollback
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rolledBack.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Completed Rollbacks</h3></div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Title</th><th>Service</th><th>Status</th></tr></thead>
              <tbody>
                {rolledBack.map(r => (
                  <tr key={r.id}>
                    <td className="cell-secondary">CR-{String(r.id).padStart(4, '0')}</td>
                    <td className="cell-title">{r.title}</td>
                    <td className="cell-secondary">{r.service_name}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {failed.length === 0 && rolledBack.length === 0 && (
        <div className="card"><div className="card-body"><div className="empty-state"><RotateCcw /><h3>No rollbacks needed</h3><p>All implementations are healthy.</p></div></div></div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title="Confirm Rollback"
        subtitle={modal?.request?.title}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => handleRollback(modal.request)} disabled={processing}>{processing ? 'Rolling back...' : 'Confirm Rollback'}</button>
        </>}>
        <div className="form-group">
          <label className="form-label">Rollback Notes</label>
          <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the rollback steps taken..." />
        </div>
      </Modal>
    </>
  );
}
