import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRequests } from '../services/api';
import StatusBadge, { PriorityBadge, RiskBadge } from '../components/StatusBadge';
import { Search, Plus, Filter } from 'lucide-react';

export default function ChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    getRequests().then(r => setRequests(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statuses = ['all', 'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'IMPLEMENTING', 'IMPLEMENTED', 'FAILED', 'ROLLED_BACK'];

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !String(r.id).includes(search)) return false;
    return true;
  });

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header-actions">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Change Requests</h1>
          <p>Create, track, and manage IT change requests.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/requests/new')}>
          <Plus size={16} /> New Change Request
        </button>
      </div>

      <div className="search-filter-bar" style={{ marginTop: 24 }}>
        <div className="search-input-wrapper">
          <Search size={16} />
          <input placeholder="Search by title or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="sort-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="sort-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Title</th><th>Requester</th><th>Service</th><th>Priority</th><th>Risk</th><th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/requests/${r.id}`)}>
                  <td className="cell-secondary">CR-{String(r.id).padStart(4, '0')}</td>
                  <td className="cell-title">{r.title}</td>
                  <td>{r.requester_name}</td>
                  <td className="cell-secondary">{r.service_name}</td>
                  <td><PriorityBadge priority={r.priority} /></td>
                  <td><RiskBadge risk={r.risk} /></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="cell-secondary">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>No change requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
