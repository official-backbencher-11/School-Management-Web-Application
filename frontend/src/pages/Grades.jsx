import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Grades = () => {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [classSubjects, setClassSubjects] = useState([]);
  
  // Grading form state
  const [examName, setExamName] = useState('Midterm Exam');
  const [subjectMarks, setSubjectMarks] = useState([]); // [{ subject, marksObtained, maxMarks }]
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Student Report Card View State
  const [studentGrades, setStudentGrades] = useState([]);
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const reportCardPrintRef = useRef(null);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        setLoading(true);
        if (user.role === 'admin' || user.role === 'teacher') {
          const classesRes = await api.get('/classes');
          setClasses(classesRes.data.data);

          const subjectsRes = await api.get('/class-subjects');
          setClassSubjects(subjectsRes.data.data);

          if (classesRes.data.data.length > 0) {
            setSelectedClass(classesRes.data.data[0]._id);
          }
        } else {
          // If Student/Parent, fetch their student profile and then their grade sheets
          const studentsRes = await api.get('/students');
          const profile = studentsRes.data.data.find(s => 
            s.user?._id === user._id || s.user === user._id || 
            s.parentUser?._id === user._id || s.parentUser === user._id
          );
          
          if (profile) {
            const gradesRes = await api.get(`/grades/student/${profile._id}`);
            setStudentGrades(gradesRes.data.data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitData();
  }, [user]);

  // Load students when class changes
  useEffect(() => {
    const fetchStudentsForClass = async () => {
      if (!selectedClass || (user.role !== 'admin' && user.role !== 'teacher')) return;
      try {
        const studentsRes = await api.get('/students');
        const list = studentsRes.data.data.filter(s => s.class?._id === selectedClass);
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudent(list[0]._id);
        } else {
          setSelectedStudent('');
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchStudentsForClass();
  }, [selectedClass, user]);

  // Setup marks fields based on the class's curriculum subjects
  useEffect(() => {
    if (!selectedStudent || (user.role !== 'admin' && user.role !== 'teacher')) return;
    
    const studentInfo = students.find(s => s._id === selectedStudent);
    if (!studentInfo || !studentInfo.class) return;

    // Find subjects mapped to this class name
    const className = studentInfo.class.className;
    const curriculum = classSubjects.find(cs => cs.className.toLowerCase() === className.toLowerCase());
    
    if (curriculum && curriculum.subjects) {
      // Map subjects to blank grading fields
      setSubjectMarks(curriculum.subjects.map(sub => ({
        subject: sub,
        marksObtained: '',
        maxMarks: 100
      })));
    } else {
      setSubjectMarks([]);
    }
  }, [selectedStudent, classSubjects, students, user]);

  // Fetch current grades for the student if they exist to pre-fill the form
  useEffect(() => {
    const loadExistingGrades = async () => {
      if (!selectedStudent || !examName || (user.role !== 'admin' && user.role !== 'teacher')) return;
      try {
        const res = await api.get(`/grades/student/${selectedStudent}`);
        const existingExam = res.data.data.find(g => g.examName.toLowerCase() === examName.toLowerCase());
        
        if (existingExam && existingExam.marks) {
          setSubjectMarks(existingExam.marks);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadExistingGrades();
  }, [selectedStudent, examName, user]);

  const handleMarkChange = (idx, value) => {
    setSubjectMarks(prev => {
      const copy = [...prev];
      copy[idx].marksObtained = value;
      return copy;
    });
  };

  const handleMaxMarkChange = (idx, value) => {
    setSubjectMarks(prev => {
      const copy = [...prev];
      copy[idx].maxMarks = value;
      return copy;
    });
  };

  const handleSaveGrades = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStudent) {
      setError('Please select a student.');
      return;
    }

    if (!examName) {
      setError('Please provide an exam label.');
      return;
    }

    // Verify marks obtained are not greater than max marks
    const invalid = subjectMarks.some(
      m => Number(m.marksObtained) < 0 || Number(m.marksObtained) > Number(m.maxMarks)
    );
    if (invalid) {
      setError('Marks obtained cannot be negative or exceed the maximum marks.');
      return;
    }

    const payload = {
      studentId: selectedStudent,
      examName,
      marks: subjectMarks.map(m => ({
        subject: m.subject,
        marksObtained: Number(m.marksObtained),
        maxMarks: Number(m.maxMarks)
      }))
    };

    try {
      setLoading(true);
      await api.post('/grades/record', payload);
      setSuccess('Grades successfully logged!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error recording grades');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReportCard = (gradeSheet) => {
    setSelectedReportCard(gradeSheet);
    setShowReportCardModal(true);
  };

  const handlePrint = () => {
    const printContent = reportCardPrintRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    // Direct print helper
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Refresh to restore react DOM binding safely
  };

  if (user.role !== 'admin' && user.role !== 'teacher') {
    return (
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Academic Grade Reports</h1>
            <p className="page-subtitle">Inspect exam mark lists and generate official transcripts.</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Available Grade Sheets</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Exam Session</th>
                  <th>Subjects Count</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="table-empty-state">No exam grades uploaded for your profile yet.</td>
                  </tr>
                ) : (
                  studentGrades.map((grade) => (
                    <tr key={grade._id}>
                      <td style={{ fontWeight: 600 }}>{grade.examName}</td>
                      <td>{grade.marks.length} Subjects</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => handleOpenReportCard(grade)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Generate Report Card
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showReportCardModal && selectedReportCard && (
          <div className="modal-overlay">
            <div className="modal-container glass-panel" style={{ maxWidth: '650px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3>Academic Report Card</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handlePrint} className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Print</button>
                  <button onClick={() => setShowReportCardModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
                </div>
              </div>

              <div ref={reportCardPrintRef} style={{ background: '#fff', color: '#000', padding: '32px', borderRadius: '8px', fontFamily: 'serif' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px double #000', paddingBottom: '16px', marginBottom: '20px' }}>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>EDUSPHERE ACADEMY</h1>
                  <p style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>Official Academic Transcript & Report Card</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.9rem' }}>
                  <div>
                    <strong>Student Name:</strong> {selectedReportCard.studentId.name}<br />
                    <strong>Roll Number:</strong> {selectedReportCard.studentId.rollNo}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>Exam:</strong> {selectedReportCard.examName}<br />
                    <strong>Date Generated:</strong> {new Date().toLocaleDateString()}
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000', borderTop: '1.5px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '10px 0' }}>Subject Title</th>
                      <th style={{ textAlign: 'center', padding: '10px 0' }}>Max Marks</th>
                      <th style={{ textAlign: 'right', padding: '10px 0' }}>Marks Obtained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReportCard.marks.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '12px 0' }}>{m.subject}</td>
                        <td style={{ textAlign: 'center', padding: '12px 0' }}>{m.maxMarks}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 'bold' }}>{m.marksObtained}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1.5px solid #000', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem' }}>
                  <span>Total Subject Count: {selectedReportCard.marks.length}</span>
                  <span>
                    Aggregate: {selectedReportCard.marks.reduce((acc, curr) => acc + curr.marksObtained, 0)} / {selectedReportCard.marks.reduce((acc, curr) => acc + curr.maxMarks, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grade Registry</h1>
          <p className="page-subtitle">Upload exam marks for pupils. Subjects are derived automatically from the class curriculum.</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="glass-panel" style={{ padding: '32px' }}>
        <form onSubmit={handleSaveGrades}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label">Select Class Section</label>
              <select
                className="form-control"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                required
              >
                <option value="">-- Select Class --</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className} - {c.section}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Select Student</label>
              <select
                className="form-control"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                required
              >
                <option value="">-- Select Pupil --</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.rollNo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: '350px', marginBottom: '32px' }}>
            <label className="form-label">Exam Label Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Midterm Exam, Finals 2026"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              required
            />
          </div>

          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Enter Marks Sheet</h3>
          {subjectMarks.length === 0 ? (
            <div className="alert alert-danger" style={{ background: 'transparent' }}>
              No subjects registered for this class curriculum. Configure Class Subjects first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              {subjectMarks.map((m, idx) => (
                <div key={m.subject} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{m.subject}</span>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Marks Obtained</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 85"
                      value={m.marksObtained}
                      onChange={(e) => handleFormMarkChange(idx, e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Maximum Marks</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="100"
                      value={m.maxMarks}
                      onChange={(e) => handleFormMaxMarkChange(idx, e.target.value)}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading || subjectMarks.length === 0}>
              {loading ? 'Recording Marks...' : 'Publish Grade Sheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Helper form handlers
  function handleFormMarkChange(idx, val) {
    handleStatusChange(idx, val, 'marksObtained');
  }

  function handleFormMaxMarkChange(idx, val) {
    handleStatusChange(idx, val, 'maxMarks');
  }

  function handleStatusChange(idx, val, field) {
    setSubjectMarks(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val === '' ? '' : Number(val) };
      return copy;
    });
  }
};

export default Grades;
