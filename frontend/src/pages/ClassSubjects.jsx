import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';

const ClassSubjects = () => {
  const { user } = useContext(AuthContext);
  const [classSubjects, setClassSubjects] = useState([]);
  const [registeredClassNames, setRegisteredClassNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Form states
  const [className, setClassName] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects registry
      const subRes = await api.get('/class-subjects');
      setClassSubjects(subRes.data.data);

      // Fetch classes to extract unique registered class names
      const classesRes = await api.get('/classes');
      const uniqueNames = Array.from(new Set(classesRes.data.data.map(c => c.className)));
      setRegisteredClassNames(uniqueNames.sort());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingEntry(null);
    setClassName(registeredClassNames[0] || '');
    setSubjectsList([]);
    setNewSubject('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    setClassName(entry.className);
    setSubjectsList(entry.subjects || []);
    setNewSubject('');
    setError('');
    setShowModal(true);
  };

  const handleAddSubject = (e) => {
    e.preventDefault();
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    
    if (subjectsList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Subject '${trimmed}' is already in the list.`);
      return;
    }

    setSubjectsList(prev => [...prev, trimmed]);
    setNewSubject('');
    setError('');
  };

  const handleRemoveSubject = (sub) => {
    setSubjectsList(prev => prev.filter(s => s !== sub));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete the subjects registry mapping for this class?')) {
      try {
        await api.delete(`/class-subjects/${id}`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Error deleting class subjects mapping');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!className) {
      setError('Please select a class name.');
      return;
    }

    if (subjectsList.length === 0) {
      setError('Please add at least one subject to the list.');
      return;
    }

    try {
      await api.post('/class-subjects', { className, subjects: subjectsList });
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving class subjects');
    }
  };

  const columns = [
    { header: 'Class Name', accessor: 'className', width: '150px', fontWeight: 600 },
    {
      header: 'Assigned Subjects',
      render: (row) => row.subjects && row.subjects.length > 0
        ? row.subjects.map(s => <span key={s} className="badge badge-teacher" style={{ marginRight: '6px', marginBottom: '4px' }}>{s}</span>)
        : <em style={{ color: 'var(--text-muted)' }}>None</em>
    },
  ];

  if (user.role === 'admin') {
    columns.push({
      header: 'Actions',
      width: '240px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleOpenEditModal(row)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Configure Subjects
          </button>
          <button onClick={() => handleDelete(row._id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Delete Registry
          </button>
        </div>
      )
    });
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Subjects Registry</h1>
          <p className="page-subtitle">Map curriculum subjects to Grades/Classes. Subjects are added one-by-one and inherited across all sections.</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={handleOpenCreateModal} className="btn btn-primary" disabled={registeredClassNames.length === 0}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Class Curriculum
          </button>
        )}
      </div>

      {registeredClassNames.length === 0 && (
        <div className="alert alert-danger">
          No classes have been defined in the Class Panel yet. Please create classes first so they can be configured with subjects.
        </div>
      )}

      <DataTable
        columns={columns}
        data={classSubjects}
        loading={loading}
        searchPlaceholder="Filter by Class Name or Subject..."
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>{editingEntry ? 'Modify Class Subjects' : 'Create Class Subjects'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Class Name</label>
                <select
                  className="form-control"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={!!editingEntry}
                  required
                >
                  <option value="">-- Choose Class Name --</option>
                  {registeredClassNames.map((cName) => (
                    <option key={cName} value={cName}>{cName}</option>
                  ))}
                </select>
                {editingEntry && <small style={{ color: 'var(--text-muted)' }}>Class name cannot be edited. Create a new entry if needed.</small>}
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Add Subject (One-by-One)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Mathematics"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                  <button type="button" onClick={handleAddSubject} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                    + Add Subject
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Curriculum Subjects List</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '6px', minHeight: '60px' }}>
                  {subjectsList.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No subjects added to curriculum list yet.</span>
                  ) : (
                    subjectsList.map((sub) => (
                      <span key={sub} className="badge badge-teacher" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
                        {sub}
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(sub)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                          title="Remove subject"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={subjectsList.length === 0}>
                  {editingEntry ? 'Save Curriculum' : 'Register Subjects'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassSubjects;
