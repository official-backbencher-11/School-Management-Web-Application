import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';

const CredentialsManager = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' or 'studentparents'
  
  // Teachers state
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Student & Parents state
  const [studentParents, setStudentParents] = useState([]);
  const [studentParentsLoading, setStudentParentsLoading] = useState(true);
  const [selectedStudentParent, setSelectedStudentParent] = useState(null);
  const [showStudentParentModal, setShowStudentParentModal] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchTeachers = async () => {
    try {
      setTeachersLoading(true);
      const res = await api.get('/credentials/teachers');
      setTeachers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTeachersLoading(false);
    }
  };

  const fetchStudentParents = async () => {
    try {
      setStudentParentsLoading(true);
      const res = await api.get('/credentials/student-parents');
      setStudentParents(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStudentParentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'teachers') {
      fetchTeachers();
    } else {
      fetchStudentParents();
    }
  }, [activeTab]);

  const handleOpenTeacherModal = (teacher) => {
    setSelectedTeacher(teacher);
    setTeacherEmail(teacher.user?.email || '');
    setTeacherPassword('');
    setError('');
    setSuccess('');
    setShowTeacherModal(true);
  };

  const handleOpenStudentParentModal = (pair) => {
    setSelectedStudentParent(pair);
    setStudentEmail(pair.user?.email || '');
    setStudentPassword('');
    setParentEmail(pair.parentUser?.email || '');
    setParentPassword('');
    setError('');
    setSuccess('');
    setShowStudentParentModal(true);
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!teacherEmail) {
      setError('Email address is required.');
      return;
    }

    try {
      setSubmitLoading(true);
      await api.post(`/credentials/teachers/${selectedTeacher._id}`, {
        email: teacherEmail,
        password: teacherPassword,
      });
      setSuccess('Teacher credentials updated successfully.');
      setTimeout(() => {
        setShowTeacherModal(false);
        fetchTeachers();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating credentials');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStudentParentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!studentEmail || !parentEmail) {
      setError('Compulsory: You must provide email addresses for both the student and parent.');
      return;
    }

    try {
      setSubmitLoading(true);
      await api.post(`/credentials/student-parents/${selectedStudentParent._id}`, {
        studentEmail,
        studentPassword,
        parentEmail,
        parentPassword,
      });
      setSuccess('Student and Parent credentials mapped and updated successfully.');
      setTimeout(() => {
        setShowStudentParentModal(false);
        fetchStudentParents();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating credentials');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Teachers columns
  const teacherColumns = [
    { header: 'Teacher Name', accessor: 'name', fontWeight: 600 },
    { header: 'Employee ID', accessor: 'employeeId' },
    {
      header: 'Login Email',
      render: (row) => row.user?.email ? (
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{row.user.email}</span>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Configured</span>
      ),
    },
    {
      header: 'Classes Managed',
      render: (row) => row.classes && row.classes.length > 0 ? (
        row.classes.map(c => <span key={c._id} className="badge badge-teacher" style={{ marginRight: '4px' }}>{c.className}-{c.section}</span>)
      ) : 'None'
    },
    {
      header: 'Actions',
      width: '150px',
      render: (row) => (
        <button onClick={() => handleOpenTeacherModal(row)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Configure Login
        </button>
      ),
    },
  ];

  // Student Parent columns
  const studentParentColumns = [
    { header: 'Student Name', accessor: 'name', fontWeight: 600 },
    { header: 'Roll Number', accessor: 'rollNo' },
    {
      header: 'Student Login',
      render: (row) => row.user?.email ? (
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{row.user.email}</span>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Login</span>
      ),
    },
    { header: 'Guardian Name', accessor: 'guardianName' },
    {
      header: 'Parent Login',
      render: (row) => row.parentUser?.email ? (
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{row.parentUser.email}</span>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Login</span>
      ),
    },
    {
      header: 'Actions',
      width: '150px',
      render: (row) => (
        <button onClick={() => handleOpenStudentParentModal(row)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Configure Logins
        </button>
      ),
    },
  ];

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Credentials Manager</h1>
          <p className="page-subtitle">Configure, link, and reset logins for school faculty, students, and parents.</p>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '24px', gap: '20px' }}>
        <button
          onClick={() => { setActiveTab('teachers'); setError(''); setSuccess(''); }}
          className="btn"
          style={{
            background: activeTab === 'teachers' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            color: activeTab === 'teachers' ? 'var(--primary)' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '0',
            borderBottom: activeTab === 'teachers' ? '2px solid var(--primary)' : 'none',
            padding: '12px 24px',
            fontWeight: 700
          }}
        >
          Teacher Logins
        </button>
        <button
          onClick={() => { setActiveTab('studentparents'); setError(''); setSuccess(''); }}
          className="btn"
          style={{
            background: activeTab === 'studentparents' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeTab === 'studentparents' ? 'var(--accent)' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '0',
            borderBottom: activeTab === 'studentparents' ? '2px solid var(--accent)' : 'none',
            padding: '12px 24px',
            fontWeight: 700
          }}
        >
          Student & Parent Logins
        </button>
      </div>

      {activeTab === 'teachers' ? (
        <DataTable
          columns={teacherColumns}
          data={teachers}
          loading={teachersLoading}
          searchPlaceholder="Search teachers by name or ID..."
        />
      ) : (
        <DataTable
          columns={studentParentColumns}
          data={studentParents}
          loading={studentParentsLoading}
          searchPlaceholder="Search students or guardians..."
        />
      )}

      {/* Teacher Credentials Modal */}
      {showTeacherModal && selectedTeacher && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3>Configure Teacher Login</h3>
                <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>For: {selectedTeacher.name} ({selectedTeacher.employeeId})</span>
              </div>
              <button onClick={() => setShowTeacherModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleTeacherSubmit}>
              <div className="form-group">
                <label className="form-label">Login Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="teacher@school.com"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password / Reset Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="•••••••• (Leave blank to keep current)"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowTeacherModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student & Parent Credentials Modal */}
      {showStudentParentModal && selectedStudentParent && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3>Configure Student & Parent Logins</h3>
                <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>Linking Student and Guardian credentials side-by-side</span>
              </div>
              <button onClick={() => setShowStudentParentModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleStudentParentSubmit}>
              <div className="alert alert-success" style={{ background: 'rgba(255,255,255,0.01)', border: 'none', padding: '0 0 16px 0', fontSize: '0.9rem' }}>
                Student: <strong>{selectedStudentParent.name} (Roll: {selectedStudentParent.rollNo})</strong> | Class: <strong>{selectedStudentParent.class ? `${selectedStudentParent.class.className}-${selectedStudentParent.class.section}` : 'N/A'}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', borderRight: '1px solid var(--glass-border)', paddingRight: '10px' }}>
                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>Student Login</h4>
                  <div className="form-group">
                    <label className="form-label">Student Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="student@school.com"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="•••••••• (Leave blank to keep)"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>Parent Login ({selectedStudentParent.guardianName || 'Guardian'})</h4>
                  <div className="form-group">
                    <label className="form-label">Parent Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="parent@school.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parent Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="•••••••• (Leave blank to keep)"
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowStudentParentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Mapping Logins...' : 'Register Logins Together'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialsManager;
