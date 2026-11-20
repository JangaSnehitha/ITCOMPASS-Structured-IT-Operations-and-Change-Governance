import { useState, useEffect } from 'react';
import { getAuditLog } from '../services/api';
import { Search, History } from 'lucide-react';

export default function AuditHistory() {
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    getAuditLog().then(r => setAudit(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const actions = ['all', ...new Set(audit.map(a => a.action))];

  const filtered = audit.filter(a => {
    if (actionFilter !== 'all' && a.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (a.action || '').toLowerCase().includes(s) ||
        (a.entity || '').toLowerCase().includes(s) ||
        (a.performed_by_name || '').toLowerCase().includes(s) ||
        String(a.entity_id).includes(s) ||
        (a.details || '').toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h1>Audit History</h1>
        <p>Complete audit trail of all system actions and changes.</p>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input placeholder="Search by action, entity, user..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="sort-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          {actions.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>User</th><th>Details</th><th>Timestamp</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td className="cell-secondary">{a.id}</td>
                  <td><span className="badge badge-submitted">{a.action}</span></td>
                  <td className="cell-secondary">{a.entity}</td>
                  <td className="cell-secondary">{a.entity_id}</td>
                  <td>{a.performed_by_name || `#${a.performed_by}`}</td>
                  <td className="cell-secondary" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.details ? (() => { try { const d = JSON.parse(a.details); return Object.entries(d).map(([k,v]) => `${k}: ${v}`).join(', '); } catch { return a.details; } })() : '—'}
                  </td>
                  <td className="cell-secondary">{new Date(a.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>No audit records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
