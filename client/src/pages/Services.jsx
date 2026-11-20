import { useState, useEffect } from 'react';
import { getServices, createService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Server, Plus } from 'lucide-react';

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    getServices().then(r => setServices(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Service name is required'); return; }
    setCreating(true); setError('');
    try {
      await createService(form);
      setToast({ type: 'success', message: `Service "${form.name}" created` });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create service');
    } finally { setCreating(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header-actions">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Services</h1>
          <p>Manage IT services that change requests can target.</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setError(''); }}>
            <Plus size={16} /> Add Service
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginTop: 24 }}>
        {services.map(s => (
          <div className="card" key={s.id}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Server size={20} style={{ color: 'var(--purple-text)' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.description || 'No description'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Added {new Date(s.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="card"><div className="card-body"><div className="empty-state"><Server /><h3>No services</h3><p>Add a service to get started.</p></div></div></div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Service"
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Add Service'}</button>
        </>}>
        {error && <div className="login-error">{error}</div>}
        <div className="form-group">
          <label className="form-label">Service Name *</label>
          <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cloud Infrastructure" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the service" />
        </div>
      </Modal>
    </>
  );
}
