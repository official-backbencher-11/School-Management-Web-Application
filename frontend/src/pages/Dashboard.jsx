import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Card from '../components/Card';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    classes: 0,
    students: 0,
    teachers: 0,
    totalFeesDue: 0,
    totalFeesPaid: 0,
  });
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Admin or Teacher can fetch all directories
        if (user.role === 'admin' || user.role === 'teacher') {
          const [classesRes, studentsRes, teachersRes, feesRes] = await Promise.all([
            api.get('/classes').catch(() => ({ data: { data: [] } })),
            api.get('/students').catch(() => ({ data: { data: [] } })),
            api.get('/teachers').catch(() => ({ data: { data: [] } })),
            api.get('/fees').catch(() => ({ data: { data: [] } })),
          ]);

          let due = 0;
          let paid = 0;
          if (feesRes.data && feesRes.data.data) {
            feesRes.data.data.forEach((fee) => {
              due += fee.amountDue || 0;
              paid += fee.amountPaid || 0;
            });
          }

          setStats({
            classes: classesRes.data?.data?.length || 0,
            students: studentsRes.data?.data?.length || 0,
            teachers: teachersRes.data?.data?.length || 0,
            totalFeesDue: due,
            totalFeesPaid: paid,
          });
        } else {
          // Students / Parents get personal details
          const studentsRes = await api.get('/students').catch(() => ({ data: { data: [] } }));
          const students = studentsRes.data?.data || [];
          
          // Find student profile matching either student user ID or parent user ID
          const profile = students.find((s) => {
            const studentUserId = s.user?._id || s.user;
            const parentUserId = s.parentUser?._id || s.parentUser;
            return studentUserId === user._id || parentUserId === user._id;
          }) || students[0]; // fallback if demo data

          if (profile) {
            setStudentProfile(profile);
            const feeRes = await api.get(`/fees/student/${profile._id}`).catch(() => ({ data: null }));
            if (feeRes && feeRes.data && feeRes.data.data) {
              setStats({
                classes: 1,
                students: 1,
                teachers: 1,
                totalFeesDue: feeRes.data.data.amountDue || 0,
                totalFeesPaid: feeRes.data.data.amountPaid || 0,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Preparing Dashboard...</span>
      </div>
    );
  }

  // Calculate percentage collection rate
  const collectionRate = stats.totalFeesDue > 0
    ? ((stats.totalFeesPaid / stats.totalFeesDue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">EduSphere Dashboard</h1>
          <p className="page-subtitle">Welcome back to your school control panel.</p>
        </div>
        <div className="date-badge glass-panel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {user.role === 'admin' || user.role === 'teacher' ? (
        <>
          <div className="stats-grid">
            <Card
              title="Enrolled Students"
              value={stats.students}
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              subtitle="Registered pupils"
              color="primary"
            />
            <Card
              title="Active Teachers"
              value={stats.teachers}
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              subtitle="Staff count"
              color="accent"
            />
            <Card
              title="Classes & Sections"
              value={stats.classes}
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V3.5A2.5 2.5 0 0 1 6.5 1H20v21H6.5a2.5 2.5 0 0 1-2.5-2.5z"/></svg>}
              subtitle="Classrooms allocated"
              color="success"
            />
            <Card
              title="Fee Collection Rate"
              value={`${collectionRate}%`}
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
              subtitle={`$${stats.totalFeesPaid} of $${stats.totalFeesDue}`}
              color="warning"
            />
          </div>

          <div className="dashboard-sections">
            <div className="dashboard-main-section glass-panel">
              <h3>System Overview</h3>
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                EduSphere integrates authentication, student administration, schedule mapping, daily roll calls, and financial records into a unified platform. As an <strong>{user.role}</strong>, you have access to critical modules in the left menu.
              </p>
              
              <div className="shortcut-box">
                <h4>Quick Operations</h4>
                <div className="shortcut-buttons">
                  <a href="/students" className="btn btn-secondary">
                    Admit New Student
                  </a>
                  <a href="/attendance" className="btn btn-secondary">
                    Mark Attendance
                  </a>
                  {user.role === 'admin' && (
                    <a href="/fees" className="btn btn-primary">
                      Record Fee Payment
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Prominent Student Profile Card on First Page for Student & Parent Login */}
          <div className="student-profile-banner glass-panel">
            {studentProfile?.profileImage ? (
              <div className="student-photo-box">
                <img src={studentProfile.profileImage} alt={studentProfile.name} />
              </div>
            ) : (
              <div className="empty-photo-box">
                <svg className="empty-photo-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>No Image Uploaded</span>
              </div>
            )}

            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{studentProfile?.name || user.name}</h2>
                  <span className="badge badge-student" style={{ marginTop: '6px' }}>
                    Student Identity Card
                  </span>
                </div>
                {studentProfile?.class && (
                  <span className="badge badge-admin" style={{ fontSize: '0.85rem' }}>
                    Class {studentProfile.class.className} - Sec {studentProfile.class.section}
                  </span>
                )}
              </div>

              <div className="student-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Roll Number</span>
                  <span className="detail-value">{studentProfile?.rollNo || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Gender</span>
                  <span className="detail-value">{studentProfile?.gender || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date of Birth</span>
                  <span className="detail-value">
                    {studentProfile?.dateOfBirth ? new Date(studentProfile.dateOfBirth).toLocaleDateString() : 'Not recorded'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Parent / Guardian Name</span>
                  <span className="detail-value">{studentProfile?.guardianName || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Guardian Contact</span>
                  <span className="detail-value">{studentProfile?.guardianPhone || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Logged Account Role</span>
                  <span className="detail-value" style={{ textTransform: 'capitalize' }}>{user.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <Card
              title="Outstanding Dues"
              value={`$${stats.totalFeesDue - stats.totalFeesPaid}`}
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
              subtitle="Pending fees statement"
              color="danger"
            />
            <Card
              title="Fees Paid"
              value={`$${stats.totalFeesPaid}`}
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              subtitle="Total ledger cleared"
              color="success"
            />
            <Card
              title="Attendance Rate"
              value="95.4%"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              subtitle="Academic presence logs"
              color="primary"
            />
          </div>

          <div className="dashboard-sections">
            <div className="dashboard-main-section glass-panel">
              <h3>Student & Parent Control Desk</h3>
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                You can review your academic records using the sidebar navigation. Check your attendance logs to ensure compatibility with school policies or inspect recent transactions in the financial statements ledger.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
