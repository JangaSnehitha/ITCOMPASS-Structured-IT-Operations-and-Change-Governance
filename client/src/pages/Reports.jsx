import { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/api';
import { BarChart3, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#eab308', '#a855f7', '#3b82f6', '#6b7280', '#f97316'];

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!stats) return <div className="empty-state"><h3>Unable to load reports</h3></div>;

  const successRate = stats.total > 0 ? Math.round((stats.implemented / stats.total) * 100) : 0;
  const failRate = stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0;

  const statusData = [
    { name: 'Implemented', value: stats.implemented, color: '#22c55e' },
    { name: 'Approved', value: stats.approved, color: '#3b82f6' },
    { name: 'Pending', value: stats.pending, color: '#eab308' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Failed', value: stats.failed, color: '#dc2626' },
    { name: 'Cancelled', value: stats.cancelled, color: '#6b7280' },
    { name: 'Draft', value: stats.draft, color: '#9ca3af' },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'Low', value: stats.priorityDistribution.low, fill: '#22c55e' },
    { name: 'Medium', value: stats.priorityDistribution.medium, fill: '#f97316' },
    { name: 'High', value: stats.priorityDistribution.high, fill: '#ef4444' },
  ];

  const riskData = [
    { name: 'Low', value: stats.riskDistribution.low, fill: '#22c55e' },
    { name: 'Medium', value: stats.riskDistribution.medium, fill: '#f97316' },
    { name: 'High', value: stats.riskDistribution.high, fill: '#ef4444' },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
        <p>Analytics and insights for IT change management.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label"><BarChart3 size={16} /> Total Changes</div>
          <div className="stat-card-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><CheckCircle size={16} /> Successful</div>
          <div className="stat-card-value" style={{ color: 'var(--green-600)' }}>{stats.implemented}</div>
          <div className="stat-card-change" style={{ color: 'var(--green-600)' }}>
            <TrendingUp size={14} /> {successRate}% success rate
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><XCircle size={16} /> Failed</div>
          <div className="stat-card-value" style={{ color: 'var(--red-600)' }}>{stats.failed}</div>
          <div className="stat-card-change" style={{ color: 'var(--red-600)' }}>
            {failRate}% failure rate
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><AlertTriangle size={16} /> Rejected</div>
          <div className="stat-card-value" style={{ color: 'var(--orange-600)' }}>{stats.rejected}</div>
        </div>
      </div>

      <div className="cards-grid-3">
        {/* Status Distribution */}
        <div className="card">
          <div className="card-header"><h3>Change Status Distribution</h3></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 120, height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData.length ? statusData : [{ name: 'None', value: 1, color: '#e5e7eb' }]}
                    cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                    {(statusData.length ? statusData : [{ color: '#e5e7eb' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              {statusData.map(d => (
                <div className="chart-legend-item" key={d.name}>
                  <span className="chart-legend-dot" style={{ background: d.color }} />
                  <span className="chart-legend-label">{d.name}</span>
                  <span className="chart-legend-value">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By Priority */}
        <div className="card">
          <div className="card-header"><h3>Changes by Priority</h3></div>
          <div className="card-body">
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 13 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* By Risk */}
        <div className="card">
          <div className="card-header"><h3>Changes by Risk Level</h3></div>
          <div className="card-body">
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 13 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {riskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="card">
        <div className="card-header"><h3>Summary Metrics</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { label: 'Draft', value: stats.draft, color: 'var(--gray-500)' },
              { label: 'Submitted / Pending', value: stats.pending, color: 'var(--yellow-500)' },
              { label: 'Approved', value: stats.approved, color: 'var(--green-500)' },
              { label: 'Implementing', value: stats.implementing, color: 'var(--purple-500)' },
              { label: 'Implemented', value: stats.implemented, color: 'var(--green-600)' },
              { label: 'Failed', value: stats.failed, color: 'var(--red-500)' },
              { label: 'Rolled Back', value: stats.rolledBack, color: 'var(--orange-500)' },
              { label: 'Rejected', value: stats.rejected, color: 'var(--red-600)' },
              { label: 'Cancelled', value: stats.cancelled, color: 'var(--gray-400)' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: m.color }}>
                  {m.value}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 550 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{stats.total > 0 ? Math.round((m.value / stats.total) * 100) : 0}% of total</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
