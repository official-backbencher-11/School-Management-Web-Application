import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';

const Classes = () => {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  
  // Form State
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [room, setRoom] = useState('');
  const [classTeacher, setClassTeacher] = useState('');
  const [error, setError] = useState('');

  const fetchClassesAndTeachers = async () => {
    try {
      setLoading(true);
      const classesRes = await api.get('/classes');
      setClasses(classesRes.data.data);

      if (user.role === 'admin') {
        const teachersRes = await api.get('/teachers');
        setTeachers(teachersRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesAndTeachers();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setClassName('');
    setSection('');
    setRoom('');
    setClassTeacher('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (cls) => {
    setEditingClass(cls);
    setClassName(cls.className);
    setSection(cls.section);
    setRoom(cls.room || '');
    setClassTeacher(cls.classTeacher?._id || '');
    setError('');
    setShowModal(true);
  };

  const handleDeleteClass = async (id) => {
    if (window.confirm('Are you sure you want to delete this class section? All student registrations will need to be reallocated.')) {
      try {
        await api.delete(`/classes/${id}`);
        fetchClassesAndTeachers();
      } catch (err) {
        console.error('Error deleting class:', err);
        alert(err.response?.data?.message || 'Error deleting class');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!className || !section) {
      setError('Class name and section are required');
      return;
    }

    const payload = {
      className,
      section,
      room,
      classTeacher: classTeacher || null,
    };

    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass._id}`, payload);
      } else {
        await api.post('/classes', payload);
      }
      setShowModal(false);
      fetchClassesAndTeachers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing request');
    }
  };

  const columns = [
    { header: 'Class Name', accessor: 'className' },
    { header: 'Section', accessor: 'section' },
    { header: 'Room', accessor: 'room', render: (row) => row.room || 'N/A' },
    {
      header: 'Class Facilitator / Teacher',
      render: (row) => row.classTeacher ? row.classTeacher.name : <em style={{ color: 'var(--text-muted)' }}>Not Assigned</em>
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
          <button onClick={() => handleDeleteClass(row._id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
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
          <h1 className="page-title">Classroom Directory</h1>
          <p className="page-subtitle">Manage class categories, sections, and class teacher allocations.</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Class Section
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={classes}
        loading={loading}
        searchPlaceholder="Filter by Class Name, Section, or Teacher..."
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>{editingClass ? 'Edit Class Section' : 'Create Class Section'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Class Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 10, Grade 6, BSC"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Section</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. A, B, Alpha"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Room 204, Lecture Hall A"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Class Teacher</label>
                <select
                  className="form-control"
                  value={classTeacher}
                  onChange={(e) => setClassTeacher(e.target.value)}
                >
                  <option value="">-- Select Class Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClass ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
