import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Messages = () => {
  const { user } = useContext(AuthContext);
  const [threads, setThreads] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]); // For teachers to pick a student's parent
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Admin view sub-tabs
  const [adminSubTab, setAdminSubTab] = useState('direct'); // 'direct' or 'teacher'

  // Selected conversation thread
  const [activeThread, setActiveThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  // New conversation modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTarget, setNewChatTarget] = useState(user.role === 'teacher' ? 'parent' : 'teacher'); 
  const [newChatTeacher, setNewChatTeacher] = useState('');
  const [newChatStudent, setNewChatStudent] = useState('');
  const [newChatContent, setNewChatContent] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const chatEndRef = useRef(null);

  const fetchThreadsAndData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // 1. Fetch conversations threads
      if (user.role === 'admin' || user.role === 'teacher') {
        const inboxRes = await api.get('/messages/inbox');
        setThreads(inboxRes.data.data);

        // Fetch students list for teacher to message parents
        if (user.role === 'teacher') {
          const studentsRes = await api.get('/students');
          setStudents(studentsRes.data.data);
          if (studentsRes.data.data.length > 0) {
            setNewChatStudent(studentsRes.data.data[0]._id);
          }
        }
      } 
      if (user.role === 'parent') {
        const threadsRes = await api.get('/messages/my-threads');
        setThreads(threadsRes.data.data);

        // Fetch teachers list for parent
        const teachersRes = await api.get('/teachers');
        setTeachers(teachersRes.data.data);
        if (teachersRes.data.data.length > 0) {
          setNewChatTeacher(teachersRes.data.data[0]._id);
        }

        // Fetch student ward profile
        const studentsRes = await api.get('/students');
        const ward = studentsRes.data.data.find(s => s.parentUser?._id === user._id || s.parentUser === user._id);
        setStudentProfile(ward);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreadsAndData();

    // Poll for new messages silently every 10 seconds
    const interval = setInterval(async () => {
      try {
        if (user.role === 'admin' || user.role === 'teacher') {
          const inboxRes = await api.get('/messages/inbox');
          setThreads(inboxRes.data.data);
          setActiveThread(currentActive => {
            if (currentActive) {
              const updated = inboxRes.data.data.find(t => t._id === currentActive._id);
              return updated || currentActive;
            }
            return currentActive;
          });
        } else if (user.role === 'parent') {
          const threadsRes = await api.get('/messages/my-threads');
          setThreads(threadsRes.data.data);
          setActiveThread(currentActive => {
            if (currentActive) {
              const updated = threadsRes.data.data.find(t => t._id === currentActive._id);
              return updated || currentActive;
            }
            return currentActive;
          });
        }
      } catch (err) {
        // Silent fail for polling
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  // Scroll to bottom of chat whenever active thread replies list changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread]);

  const handleSelectThread = async (thread) => {
    setActiveThread(thread);
    setReplyText('');
    setError('');
    setSuccess('');

    try {
      await api.put(`/messages/${thread._id}/read`);
      setThreads(prev => prev.map(t => {
        if (t._id === thread._id) {
          if (user.role === 'parent') {
            return { ...t, isReadBySender: true };
          } else {
            return { ...t, isReadByRecipient: true };
          }
        }
        return t;
      }));
    } catch (err) {
      console.error('Failed to mark thread as read', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;

    try {
      setSendingReply(true);
      const res = await api.post(`/messages/${activeThread._id}/reply`, {
        content: replyText.trim()
      });

      // Update active thread with new replies array returned by backend
      const updatedThread = {
        ...activeThread,
        replies: res.data.data.replies
      };
      
      setActiveThread(updatedThread);
      setReplyText('');

      // Refresh threads list in background
      if (user.role === 'admin' || user.role === 'teacher') {
        const inboxRes = await api.get('/messages/inbox');
        setThreads(inboxRes.data.data);
      } else {
        const threadsRes = await api.get('/messages/my-threads');
        setThreads(threadsRes.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Error transmitting reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStartNewChat = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newChatContent.trim()) {
      setError('Please enter some message content.');
      return;
    }

    if (user.role === 'parent' && newChatTarget === 'teacher' && !newChatTeacher) {
      setError('Please select a teacher.');
      return;
    }

    if (user.role === 'teacher' && newChatTarget === 'parent' && !newChatStudent) {
      setError('Please select a student.');
      return;
    }

    const payload = {
      target: newChatTarget,
      content: newChatContent.trim()
    };

    if (user.role === 'parent' && newChatTarget === 'teacher') {
      payload.recipientTeacher = newChatTeacher;
    } else if (user.role === 'teacher' && newChatTarget === 'parent') {
      payload.studentId = newChatStudent;
    }

    try {
      setSendingReply(true);
      await api.post('/messages/send', payload);
      setSuccess('Conversation initialized!');
      setNewChatContent('');
      setTimeout(() => {
        setShowNewChatModal(false);
        fetchThreadsAndData();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating thread');
    } finally {
      setSendingReply(false);
    }
  };

  const getSenderLabel = (thread) => {
    if (user.role === 'parent') {
      return thread.target === 'admin'
        ? 'School Administration'
        : `Teacher: ${thread.recipientTeacher?.name || 'N/A'}`;
    } else if (user.role === 'teacher') {
      if (thread.target === 'admin') {
         return 'School Administration';
      }
      const parentName = thread.sender ? thread.sender.name : 'Parent';
      const wardName = thread.studentId ? `(Ward: ${thread.studentId.name})` : '';
      return `${parentName} ${wardName}`;
    } else {
      // Admin sees parent name and student ward info
      const parentName = thread.sender ? thread.sender.name : 'Parent';
      const wardName = thread.studentId ? `(Ward: ${thread.studentId.name})` : '';
      return `${parentName} ${wardName}`;
    }
  };

  const filteredThreads = threads.filter(thread => {
    if (user.role !== 'admin') return true;
    if (adminSubTab === 'direct') {
      return thread.target === 'admin';
    } else {
      return thread.target === 'teacher';
    }
  });

  return (
    <div className="main-content" style={{ height: '100vh', padding: '88px 32px 32px 32px', overflow: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem' }}>Facultative Communications</h1>
          <p className="page-subtitle" style={{ fontSize: '1rem' }}>Interactive secure threads. Select a conversation to read and reply.</p>
        </div>
        { (user.role === 'parent' || user.role === 'teacher') && (
          <button onClick={() => setShowNewChatModal(true)} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 600 }}>
            + Start New Conversation
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ flexShrink: 0 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ flexShrink: 0 }}>{success}</div>}

      {/* Expanded Layout: Use 100% of available height and stretch flex children */}
      <div style={{ display: 'flex', flexGrow: 1, gap: '24px', overflow: 'hidden', minHeight: 0, height: '100%' }}>
        
        {/* Left Side: Threads list (Made wider) */}
        <div className="glass-panel" style={{ flex: '0 0 35%', minWidth: '350px', maxWidth: '450px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
            Active Chats ({filteredThreads.length})
          </div>
          
          {user.role === 'admin' && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', padding: '10px', gap: '10px', background: 'rgba(255,255,255,0.01)' }}>
              <button
                onClick={() => { setAdminSubTab('direct'); setActiveThread(null); }}
                className="btn"
                style={{
                  flexGrow: 1,
                  fontSize: '0.9rem',
                  padding: '12px',
                  background: adminSubTab === 'direct' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  color: adminSubTab === 'direct' ? 'var(--primary)' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 700,
                  borderRadius: '6px'
                }}
              >
                Admin Inbox
              </button>
              <button
                onClick={() => { setAdminSubTab('teacher'); setActiveThread(null); }}
                className="btn"
                style={{
                  flexGrow: 1,
                  fontSize: '0.9rem',
                  padding: '12px',
                  background: adminSubTab === 'teacher' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  color: adminSubTab === 'teacher' ? 'var(--accent)' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 700,
                  borderRadius: '6px'
                }}
              >
                Teacher Logs
              </button>
            </div>
          )}

          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}>
            {filteredThreads.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1rem' }}>
                {user.role === 'admin' && adminSubTab === 'direct' 
                  ? 'No direct administrator chats found.' 
                  : 'No conversation logs found.'}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = activeThread?._id === thread._id;
                const isUnread = (user.role === 'parent' && !thread.isReadBySender) || 
                                 (user.role !== 'parent' && !thread.isReadByRecipient);

                return (
                  <div
                    key={thread._id}
                    onClick={() => handleSelectThread(thread)}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
                      marginBottom: '16px',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)',
                      position: 'relative'
                    }}
                  >
                    {isUnread && (
                      <div style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'var(--danger)',
                        boxShadow: '0 0 12px var(--danger)'
                      }} />
                    )}
                    <div style={{ fontWeight: isUnread ? 800 : 700, fontSize: '1.1rem', marginBottom: '8px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                      {getSenderLabel(thread)}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {thread.replies && thread.replies.length > 0 
                        ? thread.replies[thread.replies.length - 1].content 
                        : thread.content}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'right' }}>
                      {new Date(thread.updatedAt || thread.date).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation Thread (Massive chat area) */}
        <div className="glass-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>{getSenderLabel(activeThread)}</h3>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Thread Ref ID: {activeThread._id}
                  </span>
                </div>
                <span className={`badge ${activeThread.target === 'admin' ? 'badge-admin' : 'badge-teacher'}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                  To: {activeThread.target === 'admin' ? 'School Admin' : 'Facilitator'}
                </span>
              </div>

              {/* Chat Messages Log */}
              <div style={{ flexGrow: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 1. Root Message */}
                <div style={{
                  alignSelf: activeThread.sender === user._id || activeThread.sender?._id === user._id ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: activeThread.sender === user._id || activeThread.sender?._id === user._id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeThread.sender === user._id || activeThread.sender?._id === user._id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--glass-border)',
                  padding: '16px 24px',
                  borderRadius: '16px',
                  borderTopRightRadius: activeThread.sender === user._id || activeThread.sender?._id === user._id ? '0' : '16px',
                  borderTopLeftRadius: activeThread.sender === user._id || activeThread.sender?._id === user._id ? '16px' : '0',
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '8px' }}>
                    {activeThread.sender?.name || 'Initiator'}
                  </div>
                  <div style={{ fontSize: '1.1rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {activeThread.content}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>
                    {new Date(activeThread.date).toLocaleString()}
                  </div>
                </div>

                {/* 2. Thread Replies List */}
                {activeThread.replies && activeThread.replies.map((rep, idx) => {
                  const isMe = rep.sender === user._id || rep.sender?._id === user._id;
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: isMe ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        border: isMe ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
                        padding: '16px 24px',
                        borderRadius: '16px',
                        borderTopRightRadius: isMe ? '0' : '16px',
                        borderTopLeftRadius: isMe ? '16px' : '0',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '8px' }}>
                        {rep.senderName}
                      </div>
                      <div style={{ fontSize: '1.1rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {rep.content}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>
                        {new Date(rep.date).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Reply Form Panel */}
              <form onSubmit={handleSendReply} style={{ padding: '24px', borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type your response reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sendingReply}
                  style={{ flexGrow: 1, marginBottom: 0, padding: '16px', fontSize: '1.1rem', borderRadius: '12px' }}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={sendingReply || !replyText.trim()} style={{ whiteSpace: 'nowrap', padding: '16px 32px', fontSize: '1.1rem', borderRadius: '12px' }}>
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'var(--text-muted)', padding: '60px', textAlign: 'center' }}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '24px', opacity: 0.5 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>No Conversation Selected</h3>
              <p style={{ maxWidth: '400px', fontSize: '1.1rem', lineHeight: '1.5' }}>
                Select an active conversation thread from the left panel sidebar to read details and write replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal (Parent & Teacher) */}
      {showNewChatModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: '600px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.5rem' }}>Start New Chat Thread</h3>
              <button type="button" onClick={() => setShowNewChatModal(false)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleStartNewChat}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontSize: '1.1rem' }}>Contact Target</label>
                <div style={{ display: 'flex', gap: '32px', marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  
                  {user.role === 'parent' && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1.05rem' }}>
                        <input
                          type="radio"
                          name="chatTarget"
                          value="teacher"
                          checked={newChatTarget === 'teacher'}
                          onChange={() => setNewChatTarget('teacher')}
                        />
                        Class Teacher
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1.05rem' }}>
                        <input
                          type="radio"
                          name="chatTarget"
                          value="admin"
                          checked={newChatTarget === 'admin'}
                          onChange={() => setNewChatTarget('admin')}
                        />
                        School Administration
                      </label>
                    </>
                  )}

                  {user.role === 'teacher' && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1.05rem' }}>
                        <input
                          type="radio"
                          name="chatTarget"
                          value="parent"
                          checked={newChatTarget === 'parent'}
                          onChange={() => setNewChatTarget('parent')}
                        />
                        Student's Parent
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1.05rem' }}>
                        <input
                          type="radio"
                          name="chatTarget"
                          value="admin"
                          checked={newChatTarget === 'admin'}
                          onChange={() => setNewChatTarget('admin')}
                        />
                        School Administration
                      </label>
                    </>
                  )}

                </div>
              </div>

              {user.role === 'parent' && newChatTarget === 'teacher' && (
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ fontSize: '1.1rem' }}>Select Teacher</label>
                  <select
                    className="form-control"
                    value={newChatTeacher}
                    onChange={(e) => setNewChatTeacher(e.target.value)}
                    required
                    style={{ fontSize: '1.05rem', padding: '12px' }}
                  >
                    <option value="">-- Choose Instructor --</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>{t.name} ({t.employeeId})</option>
                    ))}
                  </select>
                </div>
              )}

              {user.role === 'teacher' && newChatTarget === 'parent' && (
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ fontSize: '1.1rem' }}>Select Student</label>
                  <select
                    className="form-control"
                    value={newChatStudent}
                    onChange={(e) => setNewChatStudent(e.target.value)}
                    required
                    style={{ fontSize: '1.05rem', padding: '12px' }}
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} (Roll: {s.rollNo})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="form-label" style={{ fontSize: '1.1rem' }}>Message Content</label>
                <textarea
                  className="form-control"
                  rows="6"
                  placeholder="Type the initial topic or query content..."
                  value={newChatContent}
                  onChange={(e) => setNewChatContent(e.target.value)}
                  required
                  style={{ fontSize: '1.1rem', padding: '16px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <button type="button" onClick={() => setShowNewChatModal(false)} className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1.05rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sendingReply} style={{ padding: '12px 24px', fontSize: '1.05rem' }}>
                  Initialize Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
