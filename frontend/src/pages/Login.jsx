import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const { login, user, loading, error } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email || !password) {
      setFormError('Please enter both email and password');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="brand-logo logo-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#loginGrad)" strokeWidth="2.5">
              <defs>
                <linearGradient id="loginGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2>EduSphere Login</h2>
          <p>Access the School Management System</p>
        </div>

        {formError && <div className="alert alert-danger">{formError}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="name@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
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
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {/* Lower end Developer Page / Info Option */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <DeveloperLoginModalButton />
        </div>
      </div>
    </div>
  );
};

// Helper component for lower-end developer info modal on login screen
const DeveloperLoginModalButton = () => {
  const [open, setOpen] = useState(false);
  const [devData, setDevData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleOpen = async () => {
    setOpen(true);
    setCurrentIndex(0);
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/developers`);
      const json = await res.json();
      if (json.success) {
        setDevData(json.data);
      }
    } catch (e) {
      console.error('Error fetching developer info:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        type="button"
        className="btn btn-secondary" 
        style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', gap: '6px' }}
        onClick={handleOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        👨‍💻 View Developers Info
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>👨‍💻 Developer Information</h3>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary" style={{ padding: '2px 8px' }}>✕</button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading info...</div>
            ) : devData.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '16px' }}>
                  <div style={{ width: '90px', height: '90px', borderRadius: '12px', border: '2px solid var(--primary)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: '2rem' }}>
                    {devData[currentIndex].profileImage ? <img src={devData[currentIndex].profileImage} alt={devData[currentIndex].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : devData[currentIndex].name.charAt(0)}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{devData[currentIndex].name}</h4>
                    <span className="badge badge-admin" style={{ fontSize: '0.75rem', marginBottom: '12px', display: 'inline-block' }}>{devData[currentIndex].roleTitle}</span>
                    <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                      "{devData[currentIndex].message}"
                    </div>
                  </div>
                </div>

                {devData.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 16px', borderRadius: '20px' }}
                      onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : devData.length - 1))}
                    >
                      &larr; Prev
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {currentIndex + 1} of {devData.length}
                    </span>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 16px', borderRadius: '20px' }}
                      onClick={() => setCurrentIndex((prev) => (prev < devData.length - 1 ? prev + 1 : 0))}
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p>No developer info available.</p>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default Login;
