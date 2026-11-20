import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, CheckSquare, Calendar, Wrench,
  Server, Users, Bell, BarChart3, History, Settings, LogOut,
  Shield, ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUnreadCount, getRequests } from '../services/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
    if (['admin', 'manager'].includes(user?.role)) {
      getRequests().then(r => {
        const p = r.data.filter(req => ['SUBMITTED', 'PENDING_APPROVAL'].includes(req.status));
        setPendingCount(p.length);
      }).catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Shield size={24} />
        <h1>ChangeOps</h1>
      </div>

      <nav>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Main</div>
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/requests" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FileText size={18} /> Change Requests
          </NavLink>
          {['admin', 'manager'].includes(user?.role) && (
            <NavLink to="/approvals" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <CheckSquare size={18} /> Approvals
              {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
            </NavLink>
          )}
          <NavLink to="/scheduling" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Calendar size={18} /> Scheduling
          </NavLink>
          {['admin', 'implementer'].includes(user?.role) && (
            <NavLink to="/implementations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Wrench size={18} /> Implementations
            </NavLink>
          )}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Management</div>
          <NavLink to="/services" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Server size={18} /> Services
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users size={18} /> Users
            </NavLink>
          )}
          <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Bell size={18} /> Notifications
            {unread > 0 && <span className="badge">{unread}</span>}
          </NavLink>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Analytics</div>
          <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} /> Reports
          </NavLink>
          <NavLink to="/audit" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <History size={18} /> Audit History
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-bottom">
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={18} /> Settings
        </NavLink>
        <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <LogOut size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>
    </aside>
  );
}
