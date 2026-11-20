import { Search, Bell, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { getUnreadCount } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.count)).catch(() => {});
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={16} />
        <input type="text" placeholder="Search..." />
        <div className="topbar-shortcut">⌘ K</div>
      </div>
      <div className="topbar-actions">
        <button className="topbar-icon-btn" onClick={() => navigate('/notifications')}>
          <Bell size={20} />
          {unread > 0 && <span className="notif-dot" />}
        </button>
        <button className="topbar-icon-btn" onClick={() => navigate('/settings')}>
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
