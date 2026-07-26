import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Attendance = () => {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [viewMode, setViewMode] = useState('classList'); // 'classList' or 'marking'
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isDraft, setIsDraft] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Student View State
  const [studentLogs, setStudentLogs] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        setLoading(true);
        if (user.role === 'admin' || user.role === 'teacher') {
          const classesRes = await api.get('/classes');
          setClasses(classesRes.data.data);
        } else {
          // If Student/Parent, fetch ward profile first
          const studentsRes = await api.get('/students');
          const profile = studentsRes.data.data.find(s => s.user?._id === user._id || s.user === user._id || s.parentUser?._id === user._id || s.parentUser === user._id);
          setStudentProfile(profile);

          if (profile && profile.class) {
            // Fetch attendance logs for their class
            const res = await api.get(`/attendance/class/${profile.class._id}`);
            if (res.data && res.data.data && Array.isArray(res.data.data.records)) {
              const studentRec = res.data.data.records.find(r => r.studentId?._id === profile._id || r.studentId === profile._id);
              setStudentLogs([{
                date: res.data.data.date,
                status: studentRec ? studentRec.status : 'Present (Draft)'
              }]);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitData();
  }, [user]);

  // Load attendance sheet when class or date changes
  useEffect(() => {
    const fetchAttendanceSheet = async () => {
      if (!selectedClass || (user.role !== 'admin' && user.role !== 'teacher')) return;
      try {
        setLoading(true);
        setMessage(null);
        const res = await api.get(`/attendance/class/${selectedClass}?date=${selectedDate}`);
        
        setIsDraft(res.data.isDraft);
        // Map backend record structure to flat form state (safely handling populated student fields)
        setAttendanceRecords(res.data.data.records.map(rec => ({
          studentId: rec.studentId?._id || rec.studentId,
          name: rec.studentId?.name || 'Unknown Student',
          rollNo: rec.studentId?.rollNo || 'N/A',
          status: rec.status
        })));
      } catch (err) {
        console.error(err);
        setAttendanceRecords([]);
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'marking') {
      fetchAttendanceSheet();
    }
  }, [selectedClass, selectedDate, viewMode, user]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords(prev =>
      prev.map(rec => (rec.studentId === studentId ? { ...rec, status } : rec))
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const recordsPayload = attendanceRecords.map(rec => ({
        studentId: rec.studentId,
        status: rec.status
      }));

      await api.post('/attendance', {
        date: selectedDate,
        classId: selectedClass,
        records: recordsPayload
      });

      setIsDraft(false);
      setMessage({ type: 'success', text: 'Attendance record submitted successfully!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Error saving attendance' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClassForMarking = (classId) => {
    setSelectedClass(classId);
    setViewMode('marking');
    setMessage(null);
  };

  const handleBackToClasses = () => {
    setViewMode('classList');
    setSelectedClass('');
    setAttendanceRecords([]);
    setMessage(null);
  };

  const activeClassDetails = classes.find(c => c._id === selectedClass);

  if (user.role !== 'admin' && user.role !== 'teacher') {
    return (
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Attendance Logs</h1>
            <p className="page-subtitle">View daily school presence and check-in logs.</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <span>Fetching log sheets...</span>
          </div>
        ) : !studentProfile ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>No active student profile linked to your user account.</span>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Status Log for: <span style={{ color: 'var(--primary)' }}>{studentProfile.name} (Roll: {studentProfile.rollNo})</span></h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentLogs.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="table-empty-state">No attendance records registered for this date.</td>
                    </tr>
                  ) : (
                    studentLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td>{new Date(log.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${log.status === 'Present' ? 'badge-student' : log.status === 'Late' ? 'badge-parent' : 'badge-admin'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Teacher / Admin class selection directory
  if (viewMode === 'classList') {
    return (
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Daily Roll Call</h1>
            <p className="page-subtitle">Select a class section from the directory below to mark or update attendance.</p>
          </div>
        </div>

        {loading && classes.length === 0 ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <span>Loading class directory...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>No active class sections are registered in the Class Panel.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {classes.map((cls) => (
              <div
                key={cls._id}
                onClick={() => handleSelectClassForMarking(cls._id)}
                className="stats-card glass-panel border-primary"
                style={{ cursor: 'pointer', transition: 'var(--transition-smooth)', hover: 'translateY(-4px)' }}
              >
                <div className="card-content">
                  <span className="card-title" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>CLASSROOM SECTION</span>
                  <h3 className="card-value" style={{ margin: '8px 0', fontSize: '1.6rem' }}>
                    {cls.className} - {cls.section}
                  </h3>
                  <span className="card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🚪 Room: {cls.room || 'N/A'}
                  </span>
                </div>
                <div className="card-icon-wrapper bg-primary">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Attendance marking view
  return (
    <div className="main-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Mark Attendance</h1>
          <p className="page-subtitle">Currently marking: <strong style={{ color: 'var(--primary)' }}>{activeClassDetails ? `${activeClassDetails.className}-${activeClassDetails.section}` : 'N/A'}</strong></p>
        </div>
        <button onClick={handleBackToClasses} className="btn btn-secondary">
          ✕ Back to Classes
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '20px', maxWidth: '350px', marginBottom: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Select Log Date</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="table-wrapper glass-panel">
        <div className="table-header-toolbar">
          <h3>Roll Call Sheet</h3>
          <span className={`badge ${isDraft ? 'badge-teacher' : 'badge-student'}`}>
            {isDraft ? 'Draft/Not Logged' : 'Saved & Filed'}
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Roll Number</th>
                <th>Student Name</th>
                <th style={{ textAlign: 'center', width: '350px' }}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="table-loading-state">
                    <div className="spinner"></div>
                    <span>Loading class roll sheet...</span>
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="3" className="table-empty-state">
                    No students currently registered in this class.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((rec) => (
                  <tr key={rec.studentId}>
                    <td>{rec.rollNo}</td>
                    <td style={{ fontWeight: 600 }}>{rec.name}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`status-${rec.studentId}`}
                            value="Present"
                            checked={rec.status === 'Present'}
                            onChange={() => handleStatusChange(rec.studentId, 'Present')}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ color: rec.status === 'Present' ? 'var(--success)' : 'inherit', fontWeight: rec.status === 'Present' ? 700 : 500 }}>
                            Present
                          </span>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`status-${rec.studentId}`}
                            value="Absent"
                            checked={rec.status === 'Absent'}
                            onChange={() => handleStatusChange(rec.studentId, 'Absent')}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ color: rec.status === 'Absent' ? 'var(--danger)' : 'inherit', fontWeight: rec.status === 'Absent' ? 700 : 500 }}>
                            Absent
                          </span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`status-${rec.studentId}`}
                            value="Late"
                            checked={rec.status === 'Late'}
                            onChange={() => handleStatusChange(rec.studentId, 'Late')}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ color: rec.status === 'Late' ? 'var(--warning)' : 'inherit', fontWeight: rec.status === 'Late' ? 700 : 500 }}>
                            Late
                          </span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {attendanceRecords.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px', borderTop: '1px solid var(--glass-border)' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Publish Sheet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
