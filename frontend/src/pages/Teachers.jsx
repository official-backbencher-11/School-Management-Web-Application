import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';

const Teachers = () => {
  const { user } = useContext(AuthContext);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [subjectsStr, setSubjectsStr] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [profileImage, setProfileImage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const teachersRes = await api.get('/teachers');
      setTeachers(teachersRes.data.data);

      const classesRes = await api.get('/classes');
      setClasses(classesRes.data.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setEmployeeId('');
    setSubjectsStr('');
    setSelectedClasses([]);
    setProfileImage('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (t) => {
    setEditingTeacher(t);
    setName(t.name);
    setEmployeeId(t.employeeId);
    setSubjectsStr(t.subjects ? t.subjects.join(', ') : '');
    setSelectedClasses(t.classes ? t.classes.map(c => c._id) : []);
    setProfileImage(t.profileImage || t.user?.profileImage || '');
    setError('');
    setShowModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher? This will delete their faculty profile and user credentials.')) {
      try {
        await api.delete(`/teachers/${id}`);
        fetchData();
      } catch (err) {
        console.error('Error deleting teacher:', err);
        alert(err.response?.data?.message || 'Error deleting teacher');
      }
    }
  };

  const handleClassCheckboxChange = (classId) => {
    setSelectedClasses(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId);
      } else {
        return [...prev, classId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !employeeId) {
      setError('Please fill in all required fields.');
      return;
    }

    const subjects = subjectsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      name,
      employeeId,
      subjects,
      classes: selectedClasses,
      profileImage,
    };

    try {
      if (editingTeacher) {
        await api.put(`/teachers/${editingTeacher._id}`, payload);
      } else {
        await api.post('/teachers', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing request');
    }
  };

  const columns = [
    { header: 'Employee ID', accessor: 'employeeId', width: '120px' },
    { 
      header: 'Teacher Name', 
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
    { header: 'Email Credentials', render: (row) => row.user ? row.user.email : <em style={{ color: 'var(--text-muted)' }}>No login linked</em> },
    { header: 'Expertise / Subjects', render: (row) => row.subjects && row.subjects.length > 0 ? row.subjects.join(', ') : 'General' },
    {
      header: 'Assigned Classes',
      render: (row) => row.classes && row.classes.length > 0
        ? row.classes.map(c => `${c.className}-${c.section}`).join(', ')
        : <em style={{ color: 'var(--text-muted)' }}>None</em>
    },
  ];

  if (user.role === 'admin') {
    columns.push({
      header: 'Actions',
      width: '150px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleOpenEditModal(row)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Edit
          </button>
          <button onClick={() => handleDelete(row._id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Delete
          </button>
        </div>
      )
    });
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Register</h1>
          <p className="page-subtitle">Add teacher credentials, allocate lecture topics and class facilitator duties.</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
            Register Teacher
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        searchPlaceholder="Filter faculty by name, employee ID, email, or subjects..."
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>{editingTeacher ? 'Modify Faculty Record' : 'Register Faculty Member'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Marcus Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. EMP-1094"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Photo Upload Field (Admin Only, Optional) */}
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">📷 Teacher Profile Photo (Admin Upload - Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageFileChange}
                  className="form-control"
                />
                <div className="image-upload-preview">
                  {profileImage ? (
                    <>
                      <img src={profileImage} alt="Teacher Preview" className="preview-thumb" />
                      <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setProfileImage('')}>Clear Photo</button>
                    </>
                  ) : (
                    <div className="empty-preview-thumb">No Image Uploaded</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Expertise / Subjects (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Mathematics, Physics, Chemistry"
                  value={subjectsStr}
                  onChange={(e) => setSubjectsStr(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Class Allocations</label>
                <div className="checkbox-grid glass-panel" style={{ padding: '16px', maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.25)' }}>
                  {classes.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No classes registered yet. Create classes first.</span>
                  ) : (
                    classes.map((c) => (
                      <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(c._id)}
                          onChange={() => handleClassCheckboxChange(c._id)}
                          style={{ cursor: 'pointer' }}
                        />
                        {c.className} - {c.section} {c.room ? `(${c.room})` : ''}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTeacher ? 'Save Changes' : 'Register Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
