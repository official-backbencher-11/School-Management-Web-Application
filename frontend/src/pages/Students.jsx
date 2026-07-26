import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';

const Students = () => {
  const { user } = useContext(AuthContext);
  
  // Navigation View State
  const [viewMode, setViewMode] = useState('classList'); // 'classList' or 'studentList'
  const [selectedClass, setSelectedClass] = useState('');
  
  // Data states
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [amountDue, setAmountDue] = useState('1200'); // Initial fee
  const [profileImage, setProfileImage] = useState('');
  const [parentProfileImage, setParentProfileImage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const studentsRes = await api.get('/students');
      setStudents(studentsRes.data.data);

      const classesRes = await api.get('/classes');
      setClasses(classesRes.data.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdmitModal = () => {
    setEditingStudent(null);
    setName('');
    setRollNo('');
    setDateOfBirth('');
    setGender('Male');
    setGuardianName('');
    setGuardianPhone('');
    setAmountDue('1200');
    setProfileImage('');
    setParentProfileImage('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (std) => {
    setEditingStudent(std);
    setName(std.name);
    setRollNo(std.rollNo);
    setDateOfBirth(std.dateOfBirth ? std.dateOfBirth.split('T')[0] : '');
    setGender(std.gender || 'Male');
    setGuardianName(std.guardianName || '');
    setGuardianPhone(std.guardianPhone || '');
    setProfileImage(std.profileImage || std.user?.profileImage || '');
    setParentProfileImage(std.parentProfileImage || std.parentUser?.profileImage || '');
    setAmountDue('');
    setError('');
    setShowModal(true);
  };

  const handleImageFileChange = (e, setImageState) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageState(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student record? This will permanently delete their demographic files and billing ledger.')) {
      try {
        await api.delete(`/students/${id}`);
        fetchData();
      } catch (err) {
        console.error('Error deleting student:', err);
        alert(err.response?.data?.message || 'Error deleting student');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !rollNo || !selectedClass) {
      setError('Name, Roll Number, and Class allocation are required.');
      return;
    }

    const payload = {
      name,
      rollNo,
      classId: selectedClass,
      dateOfBirth,
      gender,
      guardianName,
      guardianPhone,
      profileImage,
      parentProfileImage,
    };

    // If admitting a new student, specify initial fee billing
    if (!editingStudent) {
      payload.amountDue = amountDue ? Number(amountDue) : 1200;
    }

    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent._id}`, payload);
      } else {
        await api.post('/students', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving student');
    }
  };

  const handleSelectClass = (classId) => {
    setSelectedClass(classId);
    setViewMode('studentList');
  };

  const handleBackToClasses = () => {
    setViewMode('classList');
    setSelectedClass('');
  };

  // Get active class details
  const activeClassDetails = classes.find(c => c._id === selectedClass);

  // Filter students for the active class section
  const filteredStudents = students.filter(s => s.class?._id === selectedClass);

  // Count students per class section helper
  const getStudentsCount = (classId) => {
    return students.filter(s => s.class?._id === classId).length;
  };

  // DataTable column definitions for students list
  const columns = [
    { header: 'Roll Number', accessor: 'rollNo', width: '120px', fontWeight: 600 },
    { 
      header: 'Student Name', 
      accessor: 'name', 
      render: (row) => {
        const imgSrc = row.profileImage || row.user?.profileImage;
        return (
          <div className="table-avatar-cell">
            {imgSrc ? (
              <img src={imgSrc} alt={row.name} className="avatar-thumb" />
            ) : (
              <div className="avatar-thumb">{row.name.charAt(0).toUpperCase()}</div>
            )}
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.name}</span>
          </div>
        );
      }
    },
    { header: 'Gender', accessor: 'gender', width: '100px' },
    { header: 'Guardian Name', accessor: 'guardianName' },
    { header: 'Guardian Phone', accessor: 'guardianPhone' },
  ];

  if (user.role === 'admin') {
    columns.push({
      header: 'Actions',
      width: '180px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleOpenEditModal(row)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Edit
          </button>
          <button onClick={() => handleDelete(row._id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Delete
          </button>
        </div>
      ),
    });
  }

  // 1. Class List Directory View
  if (viewMode === 'classList') {
    return (
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admissions & Class Registry</h1>
            <p className="page-subtitle">Select an available class section below to view enrolled pupils or admit new students.</p>
          </div>
        </div>

        {loading && classes.length === 0 ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <span>Loading class registry...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>No active class sections found. Please add classes in the Class panel.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {classes.map((cls) => (
              <div
                key={cls._id}
                onClick={() => handleSelectClass(cls._id)}
                className="stats-card glass-panel border-primary"
                style={{ cursor: 'pointer', transition: 'var(--transition-smooth)', hover: 'translateY(-4px)' }}
              >
                <div className="card-content">
                  <span className="card-title" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>CLASSROOM SECTION</span>
                  <h3 className="card-value" style={{ margin: '8px 0', fontSize: '1.6rem' }}>
                    {cls.className} - {cls.section}
                  </h3>
                  <span className="card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚪 Room: {cls.room || 'N/A'}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>• {getStudentsCount(cls._id)} Pupils</span>
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

  // 2. Student List inside Selected Class View
  return (
    <div className="main-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Class Roster</h1>
          <p className="page-subtitle">Currently viewing: <strong style={{ color: 'var(--primary)' }}>{activeClassDetails ? `${activeClassDetails.className}-${activeClassDetails.section}` : ''}</strong> (Room: {activeClassDetails?.room || 'N/A'})</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {user.role === 'admin' && (
            <button onClick={handleOpenAdmitModal} className="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Admit Student
            </button>
          )}
          <button onClick={handleBackToClasses} className="btn btn-secondary">
            ✕ Back to Classes
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredStudents}
        loading={loading}
        searchPlaceholder="Filter students in this class section..."
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>{editingStudent ? 'Modify Student Profile' : 'Admit Student'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. STU-2026-045"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Class Allocation (Locked)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={activeClassDetails ? `${activeClassDetails.className} - ${activeClassDetails.section}` : 'N/A'}
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-control"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Guardian Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Guardian Name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Guardian Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+1 555-0199"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Photo Upload Fields (Admin Only, Optional) */}
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--primary)' }}>📷 Profile Photos (Admin Upload - Optional)</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Student Photo</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageFileChange(e, setProfileImage)}
                      className="form-control"
                    />
                    <div className="image-upload-preview">
                      {profileImage ? (
                        <>
                          <img src={profileImage} alt="Student preview" className="preview-thumb" />
                          <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setProfileImage('')}>Clear</button>
                        </>
                      ) : (
                        <div className="empty-preview-thumb">No Student Image</div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Parent Photo</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageFileChange(e, setParentProfileImage)}
                      className="form-control"
                    />
                    <div className="image-upload-preview">
                      {parentProfileImage ? (
                        <>
                          <img src={parentProfileImage} alt="Parent preview" className="preview-thumb" />
                          <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setParentProfileImage('')}>Clear</button>
                        </>
                      ) : (
                        <div className="empty-preview-thumb">No Parent Image</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {!editingStudent && (
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Initial Fees Charged ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="1200"
                    value={amountDue}
                    onChange={(e) => setAmountDue(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Set initial fee invoice for the student's ledger.</small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStudent ? 'Save Profile' : 'Admit Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
