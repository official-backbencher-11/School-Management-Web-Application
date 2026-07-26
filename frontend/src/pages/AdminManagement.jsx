import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';

const AdminManagement = () => {
  const { user } = useContext(AuthContext);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/admins');
      setAdmins(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleOpenModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setProfileImage('');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleImageChange = (e) => {
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
    if (window.confirm('Are you sure you want to remove this administrator account?')) {
      try {
        await api.delete(`/auth/admins/${id}`);
        fetchAdmins();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Error deleting admin');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/register-admin', { name, email, password, profileImage });
      setSuccess('Administrator successfully registered!');
      setTimeout(() => {
        setShowModal(false);
        fetchAdmins();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering admin');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Admin Name',
      render: (row) => (
        <div className="table-avatar-cell">
          {row.profileImage ? (
            <img src={row.profileImage} alt={row.name} className="avatar-thumb" />
          ) : (
            <div className="avatar-thumb">{row.name.charAt(0).toUpperCase()}</div>
          )}
          <span style={{ fontWeight: 600 }}>{row.name}</span>
          {row.isPermanent && (
            <span title="Primary Lock (Immutable Account)" style={{ cursor: 'help' }}>
              🔒
            </span>
          )}
        </div>
      )
    },
    { header: 'Email Address', accessor: 'email' },
    {
      header: 'Account Status',
      render: (row) => (
        <span className={`badge ${row.isPermanent ? 'badge-student' : 'badge-teacher'}`}>
          {row.isPermanent ? 'Primary / Locked' : 'Administrator'}
        </span>
      )
    },
    {
      header: 'Actions',
      width: '120px',
      render: (row) => !row.isPermanent && (
        <button onClick={() => handleDelete(row._id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Revoke Access
        </button>
      )
    }
  ];

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Administrators</h1>
          <p className="page-subtitle">Configure administrative access. The bootstrap account is permanently locked from deletion.</p>
        </div>
        <button onClick={handleOpenModal} className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
          Add Administrator
        </button>
      </div>

      <DataTable
        columns={columns}
        data={admins}
        loading={loading}
        searchPlaceholder="Filter administrator accounts..."
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>Register Administrator</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Admin User"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. admin2@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">📷 Admin Profile Image (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="form-control"
                />
                <div className="image-upload-preview">
                  {profileImage ? (
                    <>
                      <img src={profileImage} alt="Admin Preview" className="preview-thumb" />
                      <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setProfileImage('')}>Clear</button>
                    </>
                  ) : (
                    <div className="empty-preview-thumb">No Image Uploaded</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
