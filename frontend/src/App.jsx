import React, { useContext } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import ClassSubjects from './pages/ClassSubjects';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import Grades from './pages/Grades';
import Fees from './pages/Fees';
import Messages from './pages/Messages';
import AdminManagement from './pages/AdminManagement';
import CredentialsManager from './pages/CredentialsManager';
import Developers from './pages/Developers';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Styles
import './App.css';

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Authenticating session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Role-Based Authorization Guard Wrapper
const RoleRoute = ({ allowedRoles }) => {
  const { user } = useContext(AuthContext);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Main Layout Wrapper (Sidebar + Top Navbar)
const Layout = () => {
  return (
    <div className="main-layout-container">
      <Sidebar />
      <div className="content-wrapper-offset">
        <Navbar />
        <Outlet />
      </div>
    </div>
  );
};

// Index Redirect Wrapper
const DefaultIndexRoute = () => {
  const { user } = useContext(AuthContext);
  if (user?.role === 'developer') {
    return <Navigate to="/developers" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

// Protected Dashboard Guard
const ProtectedDashboardRoute = () => {
  const { user } = useContext(AuthContext);
  if (user?.role === 'developer') {
    return <Navigate to="/developers" replace />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Main Application Layout Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DefaultIndexRoute />} />
          <Route path="/dashboard" element={<ProtectedDashboardRoute />} />
          
          {/* Admin & Teacher Only Pages */}
          <Route element={<RoleRoute allowedRoles={['admin', 'teacher']} />}>
            <Route path="/classes" element={<Classes />} />
            <Route path="/class-subjects" element={<ClassSubjects />} />
            <Route path="/students" element={<Students />} />
            <Route path="/teachers" element={<Teachers />} />
          </Route>

          {/* Admin Only Pages */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin-management" element={<AdminManagement />} />
            <Route path="/credentials-manager" element={<CredentialsManager />} />
          </Route>

          {/* Accessible to Parent/Teacher/Admin (Students do not get sidebar link for messages) */}
          <Route element={<RoleRoute allowedRoles={['admin', 'teacher', 'parent']} />}>
            <Route path="/messages" element={<Messages />} />
          </Route>

          {/* Accessible to all authenticated users (Student/Teacher/Admin/Parent/Developer) */}
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/developers" element={<Developers />} />
        </Route>
      </Route>

      {/* Catch-all fallback redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
