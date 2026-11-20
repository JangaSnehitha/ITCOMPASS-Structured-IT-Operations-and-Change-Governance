import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Clock, Info } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Application preferences and account settings.</p>
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header"><h3>Account Information</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="sidebar-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
                  {user?.username?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.username}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role}</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, display: 'grid', gap: 12 }}>
                {[
                  { icon: <User size={16} />, label: 'Username', value: user?.username },
                  { icon: <Shield size={16} />, label: 'Role', value: user?.role },
                  { icon: <Mail size={16} />, label: 'User ID', value: `#${user?.id}` },
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
        </div>

        <div className="card">
          <div className="card-header"><h3>System Information</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { icon: <Info size={16} />, label: 'Application', value: 'ChangeOps v1.0' },
                { icon: <Shield size={16} />, label: 'Backend', value: 'Express + SQLite' },
                { icon: <Clock size={16} />, label: 'Session', value: 'Active' },
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
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>Role Permissions</h3></div>
        <div className="card-body">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Role</th><th>Create Requests</th><th>Approve</th><th>Implement</th><th>Admin</th></tr></thead>
              <tbody>
                {[
                  { role: 'Requester', create: '✓', approve: '—', implement: '—', admin: '—' },
                  { role: 'Manager', create: '✓', approve: '✓ (Stage 1)', implement: '—', admin: '—' },
                  { role: 'Admin', create: '✓', approve: '✓ (Stage 2)', implement: '✓', admin: '✓' },
                  { role: 'Implementer', create: '✓', approve: '—', implement: '✓', admin: '—' },
                ].map(r => (
                  <tr key={r.role} style={r.role.toLowerCase() === user?.role ? { background: 'var(--blue-50)' } : {}}>
                    <td className="cell-title">{r.role}</td>
                    <td>{r.create}</td>
                    <td>{r.approve}</td>
                    <td>{r.implement}</td>
                    <td>{r.admin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
