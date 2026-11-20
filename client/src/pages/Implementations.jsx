import { useState, useEffect } from 'react';
import { getRequests, getImplementations, startImplementation, completeImplementation } from '../services/api';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import Modal from '../components/Modal';
import { Wrench, Play, CheckCircle, XCircle } from 'lucide-react';

export default function Implementations() {
  const [requests, setRequests] = useState([]);
  const [implementations, setImplementations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ready');
  const [modal, setModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('SUCCESS');
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

  const ready = requests.filter(r => r.status === 'APPROVED');
  const inProgress = requests.filter(r => r.status === 'IMPLEMENTING');
  const completed = requests.filter(r => r.status === 'IMPLEMENTED');
  const failed = requests.filter(r => r.status === 'FAILED');

  const handleStart = async (req) => {
    setProcessing(true);
    try {
      await startImplementation({ request_id: req.id, notes });
      setToast({ type: 'success', message: 'Implementation started' });
      setModal(null); setNotes('');
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to start' });
    } finally { setProcessing(false); }
  };

  const handleComplete = async (impl) => {
    setProcessing(true);
    try {
      await completeImplementation(impl.id, { outcome, notes, rollback_required: outcome === 'FAILURE' });
      setToast({ type: 'success', message: `Implementation ${outcome === 'SUCCESS' ? 'completed' : 'marked as failed'}` });
      setModal(null); setNotes(''); setOutcome('SUCCESS');
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    } finally { setProcessing(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <h1>Implementations</h1>
        <p>Track and manage IT change implementations.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('ready')}>
          <div className="stat-card-label"><Play size={16} /> Ready</div>
          <div className="stat-card-value" style={{ color: 'var(--blue-600)' }}>{ready.length}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('progress')}>
          <div className="stat-card-label"><Wrench size={16} /> In Progress</div>
          <div className="stat-card-value" style={{ color: 'var(--purple-600)' }}>{inProgress.length}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('completed')}>
          <div className="stat-card-label"><CheckCircle size={16} /> Completed</div>
          <div className="stat-card-value" style={{ color: 'var(--green-600)' }}>{completed.length}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('failed')}>
          <div className="stat-card-label"><XCircle size={16} /> Failed</div>
          <div className="stat-card-value" style={{ color: 'var(--red-600)' }}>{failed.length}</div>
        </div>
      </div>

      <div className="filter-tabs">
        {['ready', 'progress', 'completed', 'failed'].map(t => (
          <button key={t} className={`filter-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'ready' ? `Ready (${ready.length})` : t === 'progress' ? `In Progress (${inProgress.length})` : t === 'completed' ? `Completed (${completed.length})` : `Failed (${failed.length})`}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Title</th><th>Service</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {(tab === 'ready' ? ready : tab === 'progress' ? inProgress : tab === 'completed' ? completed : failed).map(r => {
                const impl = implementations.find(i => i.request_id === r.id);
                return (
                  <tr key={r.id}>
                    <td className="cell-secondary">CR-{String(r.id).padStart(4, '0')}</td>
                    <td className="cell-title">{r.title}</td>
                    <td className="cell-secondary">{r.service_name}</td>
                    <td><PriorityBadge priority={r.priority} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      {r.status === 'APPROVED' && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setModal({ type: 'start', request: r }); setNotes(''); }}>
                          <Play size={14} /> Start
                        </button>
                      )}
                      {r.status === 'IMPLEMENTING' && impl && (
                        <button className="btn btn-success btn-sm" onClick={() => { setModal({ type: 'complete', impl }); setNotes(''); setOutcome('SUCCESS'); }}>
                          <CheckCircle size={14} /> Complete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {((tab === 'ready' ? ready : tab === 'progress' ? inProgress : tab === 'completed' ? completed : failed).length === 0) && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>No items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start modal */}
      <Modal open={modal?.type === 'start'} onClose={() => setModal(null)} title="Start Implementation"
        subtitle={modal?.request?.title}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => handleStart(modal.request)} disabled={processing}>{processing ? 'Starting...' : 'Start Implementation'}</button>
        </>}>
        <div className="form-group">
          <label className="form-label">Implementation Notes</label>
          <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes before starting..." />
        </div>
      </Modal>

      {/* Complete modal */}
      <Modal open={modal?.type === 'complete'} onClose={() => setModal(null)} title="Complete Implementation"
        footer={<>
          <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className={`btn ${outcome === 'SUCCESS' ? 'btn-success' : 'btn-danger'}`}
            style={outcome === 'FAILURE' ? { background: 'var(--red-600)', color: 'white', borderColor: 'var(--red-600)' } : {}}
            onClick={() => handleComplete(modal.impl)} disabled={processing}>
            {processing ? 'Saving...' : outcome === 'SUCCESS' ? 'Mark as Successful' : 'Mark as Failed'}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Outcome</label>
          <select className="form-select" value={outcome} onChange={e => setOutcome(e.target.value)}>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Implementation outcome notes..." />
        </div>
      </Modal>
    </>
  );
}
