import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import api from '../services/api';

const Navbar = () => {
  const { user, apiUrl } = useContext(AuthContext);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(user?.profileImage || '');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = async () => {
    try {
      setUploading(true);
      setMessage('');
      const token = localStorage.getItem('token');
      const res = await api.put('/auth/profile-image', { profileImage: selectedImage }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        user.profileImage = selectedImage;
        setMessage('Profile photo updated successfully!');
        setTimeout(() => {
          setShowPhotoModal(false);
          setMessage('');
          window.location.reload(); // Refresh to sync avatar state globally
        }, 1000);
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert(err.response?.data?.message || 'Failed to update profile image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <header className="navbar-container glass-panel">
        <div className="navbar-left">
          <span className="navbar-greet">Welcome back,</span>
          <span className="navbar-username">{user.name}</span>
        </div>
        
        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ThemeToggle />
          
          <div className="navbar-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="profile-info">
              <span className="profile-name">{user.name}</span>
              <span className="profile-email">{user.email}</span>
            </div>
            <span className={`badge badge-${user.role}`}>
              {user.role}
            </span>
            <div 
              className="profile-avatar-wrapper"
              onClick={() => user.role === 'admin' && setShowPhotoModal(true)}
              style={{ cursor: user.role === 'admin' ? 'pointer' : 'default' }}
              title={user.role === 'admin' ? 'Admin: Click to update profile photo' : ''}
            >
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="avatar-img" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Self Profile Photo Modal */}
      {showPhotoModal && user.role === 'admin' && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '16px' }}>Update Admin Profile Photo</h2>
            {message && <div className="alert alert-success">{message}</div>}

            <div className="form-group">
              <label className="form-label">Select Profile Image (Max 2MB)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="form-control"
              />
            </div>

            <div className="image-upload-preview" style={{ marginBottom: '20px' }}>
              {selectedImage ? (
                <img src={selectedImage} alt="Preview" className="preview-thumb" />
              ) : (
                <div className="empty-preview-thumb">No Image Selected</div>
              )}
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Image preview will be shown above before saving.
                </p>
                {selectedImage && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem', marginTop: '6px' }}
                    onClick={() => setSelectedImage('')}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPhotoModal(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSavePhoto}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
