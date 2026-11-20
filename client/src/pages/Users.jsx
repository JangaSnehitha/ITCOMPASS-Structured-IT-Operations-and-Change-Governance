import { useState, useEffect } from 'react';
import { getUsers, createUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Users as UsersIcon, Plus, Shield, UserCheck, Wrench, User } from 'lucide-react';

const ROLE_ICONS = { admin: Shield, manager: UserCheck, implementer: Wrench, requester: User };
const ROLE_COLORS = {
  admin: { bg: 'var(--red-bg)', text: 'var(--red-text)' },
  manager: { bg: 'var(--blue-bg)', text: 'var(--blue-text)' },
  implementer: { bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  requester: { bg: 'var(--green-bg)', text: 'var(--green-text)' },
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'requester' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    getUsers().then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const handleCreate = async () => {
    if (!form.username || !form.password) { setError('Username and password are required'); return; }
    setCreating(true);
    setError('');
    try {
      await createUser(form);
      setToast({ type: 'success', message: `User "${form.username}" created` });
      setShowCreate(false);
      setForm({ username: '', password: '', role: 'requester' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally { setCreating(false); }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
    return (
      <div className="empty-state" style={{ marginTop: 80 }}>
        <Shield />
        <h3>Access Denied</h3>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  return (
    <>
      {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header-actions">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Users & Roles</h1>
          <p>Manage user accounts and role assignments.</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setError(''); }}>
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginTop: 24 }}>
        {['admin', 'manager', 'implementer', 'requester'].map(role => {
          const Icon = ROLE_ICONS[role];
          const colors = ROLE_COLORS[role];
          return (
            <div className="stat-card" key={role}>
              <div className="stat-card-label"><Icon size={16} /> {role.charAt(0).toUpperCase() + role.slice(1)}s</div>
              <div className="stat-card-value">{roleCounts[role] || 0}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header"><h3>All Users ({users.length})</h3></div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Created</th></tr></thead>
            <tbody>
              {users.map(u => {
                const colors = ROLE_COLORS[u.role] || {};
                return (
                  <tr key={u.id}>
                    <td className="cell-secondary">{u.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="cell-title">{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: colors.bg, color: colors.text }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="cell-secondary">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User" subtitle="Add a user to the system."
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </>}>
        {error && <div className="login-error">{error}</div>}
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Enter username" />
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter password" />
        </div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="requester">Requester</option>
            <option value="manager">Manager</option>
            <option value="implementer">Implementer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </Modal>
    </>
  );
}
