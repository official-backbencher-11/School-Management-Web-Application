import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Developers = () => {
  const { user } = useContext(AuthContext);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDev, setEditingDev] = useState(null);

  // Edit Form states
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [messageText, setMessageText] = useState('');

  // Add Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('Software Engineer');
  const [newProfileImage, setNewProfileImage] = useState('');
  const [newMessageText, setNewMessageText] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDevelopers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/developers');
      setDevelopers(res.data.data);
    } catch (err) {
      console.error('Error fetching developers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const handleOpenAddModal = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRoleTitle('Software Engineer');
    setNewProfileImage('');
    setNewMessageText('Hello! I contributed to building EduSphere.');
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (dev) => {
    setEditingDev(dev);
    setName(dev.name || '');
    setRoleTitle(dev.roleTitle || '');
    setProfileImage(dev.profileImage || '');
    setMessageText(dev.message || '');
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };

  const handleImageFileChange = (e, setImageState) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please select a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageState(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDev) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const res = await api.put(
        `/developers/${editingDev._id}`,
        { name, roleTitle, profileImage, message: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccess('Developer profile updated successfully!');
        setTimeout(() => {
          setShowEditModal(false);
          fetchDevelopers();
        }, 800);
      }
    } catch (err) {
      console.error('Error updating developer:', err);
      setError(err.response?.data?.message || 'Failed to update developer profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDeveloper = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const res = await api.post(
        '/developers',
        {
          name: newName,
          email: newEmail,
          password: newPassword,
          roleTitle: newRoleTitle,
          profileImage: newProfileImage,
          message: newMessageText,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccess('New developer added successfully!');
        setTimeout(() => {
          setShowAddModal(false);
          fetchDevelopers();
        }, 800);
      }
    } catch (err) {
      console.error('Error adding developer:', err);
      setError(err.response?.data?.message || 'Failed to add developer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDev = async (devId) => {
    if (window.confirm('Are you sure you want to remove this developer profile?')) {
      try {
        const token = localStorage.getItem('token');
        await api.delete(`/developers/${devId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchDevelopers();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete developer.');
      }
    }
  };

  const canEdit = user && (user.role === 'developer' || user.role === 'admin');

  return (
    <div className="main-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">EduSphere Core Developers</h1>
          <p className="page-subtitle">Meet the engineering team behind EduSphere's architecture and design system.</p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={handleOpenAddModal} className="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add New Developer
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading developer profiles...</span>
        </div>
      ) : developers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No developer profiles found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px', marginTop: '12px' }}>
          {developers.map((dev) => (
            <div key={dev._id} className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div 
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 4px 20px var(--primary-glow)',
                    flexShrink: 0,
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'var(--primary)'
                  }}
                >
                  {dev.profileImage ? (
                    <img src={dev.profileImage} alt={dev.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    dev.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>{dev.name}</h2>
                  <span className="badge badge-admin" style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                    {dev.roleTitle || 'Developer'}
                  </span>
                </div>
              </div>

              {/* Editable Developer Message Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '18px',
                position: 'relative'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Developer Note / Statement
                </div>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                  "{dev.message}"
                </p>
              </div>

              {canEdit && (
                <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleOpenEditModal(dev)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    ✏️ Edit Profile
                  </button>
                  {dev.user?.email !== 'developershivam@gmail.com' && (
                    <button
                      onClick={() => handleDeleteDev(dev._id)}
                      className="btn btn-danger"
                      style={{ padding: '8px 12px' }}
                      title="Remove developer profile"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Developer Edit Modal */}
      {showEditModal && editingDev && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Edit Developer Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Developer Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Developer Role / Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Lead Full-Stack Developer" 
                  value={roleTitle} 
                  onChange={(e) => setRoleTitle(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">📷 Developer Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageFileChange(e, setProfileImage)} 
                  className="form-control" 
                />
                <div className="image-upload-preview" style={{ marginTop: '8px' }}>
                  {profileImage ? (
                    <>
                      <img src={profileImage} alt="Preview" className="preview-thumb" />
                      <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setProfileImage('')}>Clear</button>
                    </>
                  ) : (
                    <div className="empty-preview-thumb">No Image Uploaded</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">💬 Developer Text Box Message</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  placeholder="Write message to display on developer page..." 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Developer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Add New Developer</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleCreateDeveloper}>
              <div className="form-group">
                <label className="form-label">Developer Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Alex Rivera"
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Login Email (Optional)</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="alex@dev.com" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Login Password (Optional)</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="••••••••" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Developer Role / Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Frontend Specialist / Backend Engineer" 
                  value={newRoleTitle} 
                  onChange={(e) => setNewRoleTitle(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">📷 Developer Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageFileChange(e, setNewProfileImage)} 
                  className="form-control" 
                />
                <div className="image-upload-preview" style={{ marginTop: '8px' }}>
                  {newProfileImage ? (
                    <>
                      <img src={newProfileImage} alt="Preview" className="preview-thumb" />
                      <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setNewProfileImage('')}>Clear</button>
                    </>
                  ) : (
                    <div className="empty-preview-thumb">No Image Selected</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">💬 Developer Text Box Message</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Write statement or bio message for this developer..." 
                  value={newMessageText} 
                  onChange={(e) => setNewMessageText(e.target.value)} 
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Add Developer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Developers;
