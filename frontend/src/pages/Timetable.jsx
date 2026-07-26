import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { name: 'Period 1', time: '09:00 - 09:45' },
  { name: 'Period 2', time: '09:45 - 10:30' },
  { name: 'Period 3', time: '10:30 - 11:15' },
  { name: 'Break', time: '11:15 - 11:45', isBreak: true },
  { name: 'Period 4', time: '11:45 - 12:30' },
  { name: 'Period 5', time: '12:30 - 01:15' },
  { name: 'Period 6', time: '01:15 - 02:00' },
];

const Timetable = () => {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [timetableData, setTimetableData] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Slot Config Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSlotTime, setSelectedSlotTime] = useState('');
  const [selectedSlotName, setSelectedSlotName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [error, setError] = useState('');

  const fetchInitData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes
      const classesRes = await api.get('/classes');
      const classesList = classesRes.data.data;
      setClasses(classesList);

      // Fetch teachers
      const teachersRes = await api.get('/teachers');
      setTeachers(teachersRes.data.data);

      // Fetch curriculum subjects
      const subjectsRes = await api.get('/class-subjects');
      setClassSubjects(subjectsRes.data.data);

      if (user.role === 'admin' || user.role === 'teacher') {
        if (classesList.length > 0) {
          setSelectedClass(classesList[0]._id);
        }
      } else {
        // Students/Parents look up their own class
        const studentsRes = await api.get('/students');
        const profile = studentsRes.data.data.find(s => 
          s.user?._id === user._id || s.user === user._id || 
          s.parentUser?._id === user._id || s.parentUser === user._id
        );
        if (profile && profile.class) {
          setSelectedClass(profile.class._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitData();
  }, []);

  // Fetch timetable slots whenever selectedClass changes
  const fetchTimetable = async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const res = await api.get(`/timetable/class/${selectedClass}`);
      setTimetableData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [selectedClass]);

  const getClassInfo = () => {
    return classes.find(c => c._id === selectedClass);
  };

  // Find subjects configured for the selected class name (e.g. "10")
  const getAvailableSubjects = () => {
    const cls = getClassInfo();
    if (!cls) return [];
    const subjectsEntry = classSubjects.find(s => s.className.toLowerCase() === cls.className.toLowerCase());
    return subjectsEntry ? subjectsEntry.subjects : [];
  };

  const getSlotValue = (day, time) => {
    const daySchedule = timetableData.find(t => t.day === day);
    if (!daySchedule) return null;
    return daySchedule.slots.find(s => s.time === time);
  };

  const handleOpenSlotModal = (day, slot) => {
    if (user.role !== 'admin' && user.role !== 'teacher') return; // Read-only for students/parents
    if (slot.isBreak) return;

    const currentSlot = getSlotValue(day, slot.time);
    
    setSelectedDay(day);
    setSelectedSlotTime(slot.time);
    setSelectedSlotName(slot.name);
    setFormSubject(currentSlot ? currentSlot.subject : '');
    setFormTeacher(currentSlot?.teacherId?._id || currentSlot?.teacherId || '');
    setFormRoom(currentSlot ? currentSlot.room || '' : getClassInfo()?.room || '');
    setError('');
    setShowModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setError('');

    if (!formSubject) {
      setError('Please select a subject.');
      return;
    }

    // Prepare slots array to send. We must retain other slots for that day, or update
    const daySchedule = timetableData.find(t => t.day === selectedDay);
    let updatedSlots = [];

    if (daySchedule) {
      // Filter out the slot we are editing, then push new configuration
      const filtered = daySchedule.slots.filter(s => s.time !== selectedSlotTime);
      updatedSlots = [
        ...filtered,
        {
          subject: formSubject,
          teacherId: formTeacher || null,
          time: selectedSlotTime,
          room: formRoom
        }
      ];
    } else {
      updatedSlots = [{
        subject: formSubject,
        teacherId: formTeacher || null,
        time: selectedSlotTime,
        room: formRoom
      }];
    }

    try {
      await api.post('/timetable', {
        classId: selectedClass,
        day: selectedDay,
        slots: updatedSlots
      });
      setShowModal(false);
      fetchTimetable();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving timetable slot');
    }
  };

  const classInfo = getClassInfo();
  const availableSubjects = getAvailableSubjects();

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Timetable Planner</h1>
          <p className="page-subtitle">Schedule weekly lessons and lecture slots. Hover and click cells to manually configure subjects.</p>
        </div>
      </div>

      {(user.role === 'admin' || user.role === 'teacher') && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '8px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Class Section</label>
            <select
              className="form-control"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.className} - {c.section} {c.room ? `(${c.room})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading Timetable Scheduling...</span>
        </div>
      ) : !selectedClass ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>No class section selected or registered for your profile.</span>
        </div>
      ) : (
        <div className="table-wrapper glass-panel" style={{ padding: '24px' }}>
          <div className="table-header-toolbar" style={{ border: 'none', padding: '0 0 20px 0' }}>
            <h3>Timetable: <span style={{ color: 'var(--primary)' }}>{classInfo ? `${classInfo.className}-${classInfo.section}` : ''}</span></h3>
            <span className="badge badge-teacher">
              Room: {classInfo?.room || 'N/A'}
            </span>
          </div>

          <div className="table-container">
            <table className="custom-table" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Time Slot</th>
                  {DAYS.map(day => (
                    <th key={day} style={{ textAlign: 'center' }}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => {
                  if (slot.isBreak) {
                    return (
                      <tr key={slot.name} style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ fontWeight: 700, color: 'var(--warning)' }}>
                          {slot.time}
                        </td>
                        <td colSpan={DAYS.length} style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                          ☕ 30-Minute Break Period
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.time}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        <div style={{ fontSize: '0.9rem' }}>{slot.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{slot.time}</div>
                      </td>

                      {DAYS.map((day) => {
                        const cell = getSlotValue(day, slot.time);
                        const isEditable = user.role === 'admin' || user.role === 'teacher';
                        return (
                          <td
                            key={day}
                            onClick={() => handleOpenSlotModal(day, slot)}
                            style={{
                              textAlign: 'center',
                              cursor: isEditable ? 'pointer' : 'default',
                              transition: 'var(--transition-smooth)',
                            }}
                            className={isEditable ? 'timetable-cell-hover' : ''}
                          >
                            {cell ? (
                              <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                  {cell.subject}
                                </div>
                                {cell.teacherId && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    👨‍🏫 {cell.teacherId.name}
                                  </div>
                                )}
                                {cell.room && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    🚪 {cell.room}
                                  </div>
                                )}
                              </div>
                            ) : (
                              isEditable ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>+ Schedule</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Free Slot</span>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3>Configure Lesson Slot</h3>
                <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>{selectedDay} at {selectedSlotTime} ({selectedSlotName})</span>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSaveSlot}>
              <div className="form-group">
                <label className="form-label">Subject (from Class Subjects Curriculum)</label>
                <select
                  className="form-control"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                {availableSubjects.length === 0 && (
                  <small style={{ color: 'var(--danger)', marginTop: '4px' }}>
                    No subjects registered for Class "{classInfo?.className}". Go to 'Class Subjects' to add some first!
                  </small>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Assign Teacher / Instructor</label>
                <select
                  className="form-control"
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                >
                  <option value="">-- Select Instructor --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name} ({t.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lecture Room / Hall</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Room 302"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={availableSubjects.length === 0}>
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
