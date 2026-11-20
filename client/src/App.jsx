import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChangeRequests from './pages/ChangeRequests';
import CreateRequest from './pages/CreateRequest';
import RequestDetails from './pages/RequestDetails';
import Approvals from './pages/Approvals';
import Scheduling from './pages/Scheduling';
import Implementations from './pages/Implementations';
import Rollbacks from './pages/Rollbacks';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Services from './pages/Services';
import AuditHistory from './pages/AuditHistory';
import Settings from './pages/Settings';
import './index.css';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/requests" element={<ChangeRequests />} />
            <Route path="/requests/new" element={<CreateRequest />} />
            <Route path="/requests/:id" element={<RequestDetails />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/scheduling" element={<Scheduling />} />
            <Route path="/implementations" element={<Implementations />} />
            <Route path="/rollbacks" element={<Rollbacks />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/services" element={<Services />} />
            <Route path="/audit" element={<AuditHistory />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
