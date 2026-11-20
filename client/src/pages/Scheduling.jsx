import { useState, useEffect } from 'react';
import { getRequests } from '../services/api';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function Scheduling() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  useEffect(() => {
    getRequests().then(r => {
      const scheduled = r.data.filter(req => ['APPROVED', 'IMPLEMENTING', 'IMPLEMENTED'].includes(req.status) && req.planned_start);
      setRequests(scheduled);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const upcoming = requests.filter(r => r.status === 'APPROVED');
  const inProgress = requests.filter(r => r.status === 'IMPLEMENTING');
  const completed = requests.filter(r => r.status === 'IMPLEMENTED');

  // Simple calendar grid for current month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const getEventsForDay = (day) => {
    if (!day) return [];
    return requests.filter(r => {
      if (!r.planned_start) return false;
      const d = new Date(r.planned_start);
      return d.getDate() === day && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  };

  return (
    <>
      <div className="page-header-actions">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Scheduling</h1>
          <p>View and manage scheduled IT changes.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>List</button>
          <button className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('calendar')}>Calendar</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label"><Calendar size={16} /> Upcoming</div>
          <div className="stat-card-value" style={{ color: 'var(--blue-600)' }}>{upcoming.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Clock size={16} /> In Progress</div>
          <div className="stat-card-value" style={{ color: 'var(--purple-600)' }}>{inProgress.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><AlertTriangle size={16} /> Completed</div>
          <div className="stat-card-value" style={{ color: 'var(--green-600)' }}>{completed.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><AlertTriangle size={16} /> Total Scheduled</div>
          <div className="stat-card-value">{requests.length}</div>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="card">
          <div className="card-header">
            <h3>{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ padding: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>{d}</div>
              ))}
              {calDays.map((day, i) => {
                const events = getEventsForDay(day);
                const isToday = day === now.getDate();
                return (
                  <div key={i} style={{
                    padding: 8, minHeight: 80, border: '1px solid var(--border-light)', borderRadius: 6,
                    background: isToday ? 'var(--blue-50)' : day ? 'white' : 'var(--bg-secondary)'
                  }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--blue-600)' : 'var(--text-primary)' }}>{day}</div>
                        {events.map(e => (
                          <div key={e.id} style={{ fontSize: 10, background: 'var(--green-bg)', color: 'var(--green-text)', padding: '2px 4px', borderRadius: 4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.title.slice(0, 20)}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><h3>Scheduled Changes</h3></div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Title</th><th>Service</th><th>Priority</th><th>Planned Start</th><th>Planned End</th><th>Status</th></tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td className="cell-secondary">CR-{String(r.id).padStart(4, '0')}</td>
                    <td className="cell-title">{r.title}</td>
                    <td className="cell-secondary">{r.service_name}</td>
                    <td><PriorityBadge priority={r.priority} /></td>
                    <td className="cell-secondary">{r.planned_start ? new Date(r.planned_start).toLocaleString() : '—'}</td>
                    <td className="cell-secondary">{r.planned_end ? new Date(r.planned_end).toLocaleString() : '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)' }}>No scheduled changes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
