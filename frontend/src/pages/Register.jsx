import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin'); // Default role registration is admin
  const [formError, setFormError] = useState('');
  const { register, user, loading, error } = useContext(AuthContext);
  const navigate = useNavigate();
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
      return;
    }

    const checkSystemInit = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/check-bootstrap`);
        if (res.data.success && res.data.initialized) {
          navigate('/login');
        }
      } catch (err) {
        console.error('Error checking system bootstrap:', err);
      } finally {
        setCheckingBootstrap(false);
      }
    };

    checkSystemInit();
  }, [user, navigate, API_URL]);

  if (checkingBootstrap) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Checking system initialization...</span>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name || !email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    const res = await register(name, email, password, role);
    if (res.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="brand-logo logo-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#regGrad)" strokeWidth="2.5">
              <defs>
                <linearGradient id="regGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2>Create Account</h2>
          <p>Register an Admin or User Account</p>
        </div>

        {formError && <div className="alert alert-danger">{formError}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="admin@school.com"
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

          <div className="form-group">
            <label className="form-label">Designated Role</label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="admin">System Administrator</option>
              <option value="teacher">Teacher (Class Facilitator)</option>
              <option value="student">Student Account</option>
              <option value="parent">Parent Guardian</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already registered? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
