import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';
import StatusBadge, { PriorityBadge, RiskBadge } from '../components/StatusBadge';
import { FileText, Clock, CheckCircle, Activity, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DONUT_COLORS = ['#eab308', '#22c55e', '#ef4444', '#a855f7', '#3b82f6', '#6b7280'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats().then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!stats) return <div className="empty-state"><h3>Unable to load dashboard</h3></div>;

  const approvalData = [
    { name: 'Pending', value: stats.pending, color: '#eab308' },
    { name: 'Approved', value: stats.approved, color: '#22c55e' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const totalApproval = approvalData.reduce((s, d) => s + d.value, 0);

  const riskTotal = stats.riskDistribution.low + stats.riskDistribution.medium + stats.riskDistribution.high;

  const filteredRecent = (stats.recent || []).filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || String(r.id).includes(search)
  );

  return (
    <>
      <div className="page-header">
        <h1>Overview</h1>
        <p>Monitor and manage IT changes across your organization.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label"><FileText size={16} /> Total Change Requests</div>
          <div className="stat-card-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Clock size={16} /> Pending Approvals</div>
          <div className="stat-card-value" style={{ color: 'var(--orange-600)' }}>{stats.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><CheckCircle size={16} /> Approved Changes</div>
          <div className="stat-card-value" style={{ color: 'var(--green-600)' }}>{stats.approved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Activity size={16} /> Completed Changes</div>
          <div className="stat-card-value" style={{ color: 'var(--purple-600)' }}>{stats.implemented}</div>
        </div>
      </div>

      <div className="cards-grid-3">
        {/* Approval Status Donut */}
        <div className="card">
          <div className="card-header"><h3>Change Approval Status</h3></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 120, height: 120, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={approvalData.length ? approvalData : [{ name: 'None', value: 1, color: '#e5e7eb' }]}
                    cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                    {(approvalData.length ? approvalData : [{ color: '#e5e7eb' }]).map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{totalApproval > 0 ? Math.round((stats.approved / totalApproval) * 100) : 0}%</div>
              </div>
            </div>
            <div className="chart-legend">
              {approvalData.map(d => (
                <div className="chart-legend-item" key={d.name}>
                  <span className="chart-legend-dot" style={{ background: d.color }} />
                  <span className="chart-legend-label">{d.name}</span>
                  <span className="chart-legend-value">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="card">
          <div className="card-header"><h3>Change Risk Distribution</h3></div>
          <div className="card-body">
            {[
              { label: 'Low Risk', value: stats.riskDistribution.low, color: 'var(--green-500)', bg: 'var(--green-100)' },
              { label: 'Medium Risk', value: stats.riskDistribution.medium, color: 'var(--orange-500)', bg: 'var(--orange-100)' },
              { label: 'High Risk', value: stats.riskDistribution.high, color: 'var(--red-500)', bg: 'var(--red-100)' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.value}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: r.bg }}>
                  <div style={{ height: '100%', borderRadius: 4, background: r.color, width: `${riskTotal > 0 ? (r.value / riskTotal) * 100 : 0}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Change Activity */}
        <div className="card">
          <div className="card-header"><h3>Change Activity</h3></div>
          <div className="card-body">
            {[
              { label: 'Completed', value: stats.implemented, total: stats.total, color: 'var(--green-500)' },
              { label: 'Awaiting Approval', value: stats.pending, total: stats.total, color: 'var(--orange-500)' },
              { label: 'Implementing', value: stats.implementing, total: stats.total, color: 'var(--purple-500)' },
              { label: 'Draft', value: stats.draft, total: stats.total, color: 'var(--gray-400)' },
            ].map(a => (
              <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {a.value}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 550 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{a.total > 0 ? Math.round((a.value / a.total) * 100) : 0}% of total</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Change Requests */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Change Requests</h3>
          <div className="search-input-wrapper" style={{ minWidth: 220 }}>
            <Search size={16} />
            <input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Title</th><th>Requester</th><th>Service</th><th>Priority</th><th>Risk</th><th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map(r => (
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
              {filteredRecent.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
