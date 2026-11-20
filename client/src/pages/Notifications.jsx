import { useState, useEffect } from 'react';
import { getNotifications, markNotifRead, markAllRead } from '../services/api';
import { Bell, CheckCheck, Mail, MailOpen } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    getNotifications().then(r => setNotifications(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotifRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    } catch (err) { console.error(err); }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (err) { console.error(err); }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header-actions">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Notifications</h1>
          <p>Stay updated on approvals, changes, and system events.</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline" onClick={handleMarkAll}>
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="filter-tabs" style={{ marginTop: 20 }}>
        <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({notifications.length})
        </button>
        <button className={`filter-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          Unread ({unreadCount})
        </button>
        <button className={`filter-tab ${filter === 'read' ? 'active' : ''}`} onClick={() => setFilter('read')}>
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="card-body">
            <div className="empty-state">
              <Bell />
              <h3>No notifications</h3>
              <p>{filter === 'unread' ? 'All caught up!' : 'No notifications yet.'}</p>
            </div>
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              className={`notif-item ${n.read ? '' : 'unread'}`}
              onClick={() => !n.read && handleMarkRead(n.id)}
            >
              {n.read ? (
                <MailOpen size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 3 }} />
              ) : (
                <div className="notif-dot-unread" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: n.read ? 400 : 500 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {!n.read && (
                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}>
                  <CheckCheck size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
