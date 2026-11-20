import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRequest, getServices } from '../services/api';
import { ArrowLeft } from 'lucide-react';

export default function CreateRequest() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', service_id: '', priority: 'Medium',
    risk: 'Low', impact: 'Low', planned_start: '', planned_end: '',
    justification: '', implementation_plan: '', rollback_plan: ''
  });

  useEffect(() => {
    getServices().then(r => setServices(r.data)).catch(console.error);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.service_id || !form.priority || !form.risk || !form.impact) {
      setError('Please fill in all required fields'); return;
    }
    setLoading(true);
    setError('');
    try {
      const desc = [form.description, form.justification ? `\n\nBusiness Justification: ${form.justification}` : '',
        form.implementation_plan ? `\n\nImplementation Plan: ${form.implementation_plan}` : '',
        form.rollback_plan ? `\n\nRollback Plan: ${form.rollback_plan}` : ''].join('');
      const res = await createRequest({
        title: form.title, description: desc, service_id: parseInt(form.service_id),
        priority: form.priority, risk: form.risk, impact: form.impact,
        planned_start: form.planned_start || null, planned_end: form.planned_end || null
      });
      navigate(`/requests/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="btn btn-ghost" onClick={() => navigate('/requests')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Change Requests
      </button>
      <div className="page-header">
        <h1>New Change Request</h1>
        <p>Submit a new IT change request for review and approval.</p>
      </div>

      <div className="card">
        <div className="card-body">
          {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Change Title *</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Describe the change in a few words" />
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed description of the proposed change" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Service *</label>
                <select className="form-select" value={form.service_id} onChange={e => set('service_id', e.target.value)}>
                  <option value="">Select a service...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority *</label>
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Risk Level *</label>
                <select className="form-select" value={form.risk} onChange={e => set('risk', e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Impact Level *</label>
                <select className="form-select" value={form.impact} onChange={e => set('impact', e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Business Justification</label>
              <textarea className="form-textarea" rows={3} value={form.justification} onChange={e => set('justification', e.target.value)} placeholder="Why is this change necessary?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Planned Start</label>
                <input className="form-input" type="datetime-local" value={form.planned_start} onChange={e => set('planned_start', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Planned End</label>
                <input className="form-input" type="datetime-local" value={form.planned_end} onChange={e => set('planned_end', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Implementation Plan</label>
              <textarea className="form-textarea" rows={3} value={form.implementation_plan} onChange={e => set('implementation_plan', e.target.value)} placeholder="Step-by-step implementation plan" />
            </div>
            <div className="form-group">
              <label className="form-label">Rollback Plan</label>
              <textarea className="form-textarea" rows={3} value={form.rollback_plan} onChange={e => set('rollback_plan', e.target.value)} placeholder="Steps to revert if the change fails" />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/requests')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Change Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
