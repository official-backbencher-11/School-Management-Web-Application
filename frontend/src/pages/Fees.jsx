import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';

const Fees = () => {
  const { user } = useContext(AuthContext);
  const [ledger, setLedger] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Drawers State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  // Selected Objects State
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  
  // Payment Form States
  const [selectedStudent, setSelectedStudent] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Personal Student Statement State
  const [personalFee, setPersonalFee] = useState(null);

  const receiptPrintRef = useRef(null);

  const fetchLedgerAndStudents = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      if (user.role === 'admin' || user.role === 'teacher') {
        const ledgerRes = await api.get('/fees');
        setLedger(ledgerRes.data.data);

        if (user.role === 'admin') {
          const studentsRes = await api.get('/students');
          setStudents(studentsRes.data.data);
          if (studentsRes.data.data.length > 0) {
            setSelectedStudent(studentsRes.data.data[0]._id);
          }
        }
      } else {
        // Fetch personal student profile
        const studentsRes = await api.get('/students');
        const profile = studentsRes.data.data.find(s => s.user?._id === user._id || s.user === user._id || s.parentUser?._id === user._id || s.parentUser === user._id);
        
        if (profile) {
          const feeRes = await api.get(`/fees/student/${profile._id}`);
          setPersonalFee(feeRes.data.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerAndStudents();
  }, []);

  const handleOpenPaymentModal = () => {
    setPaymentAmount('');
    setRemarks('');
    setPaymentMethod('Cash');
    setError('');
    setSuccess('');
    setShowPaymentModal(true);
  };

  const handleOpenDetails = (entry) => {
    setSelectedLedgerEntry(entry);
    setShowDetailsModal(true);
  };

  const handleOpenReceipt = (receipt, student) => {
    setSelectedReceipt({
      ...receipt,
      studentName: student.name,
      rollNo: student.rollNo,
      classInfo: student.class ? `${student.class.className}-${student.class.section}` : 'N/A'
    });
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    const printContent = receiptPrintRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Refresh to restore react DOM binding safely
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStudent || !paymentAmount || Number(paymentAmount) <= 0) {
      setError('Please provide a valid student and payment amount.');
      return;
    }

    try {
      await api.post('/fees/pay', {
        studentId: selectedStudent,
        amount: Number(paymentAmount),
        paymentMethod,
        remarks
      });

      setSuccess('Payment successfully logged!');
      setTimeout(() => {
        setShowPaymentModal(false);
        fetchLedgerAndStudents();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Error logging payment transaction');
    }
  };

  const columns = [
    {
      header: 'Student Name',
      render: (row) => row.studentId ? (
        <button
          onClick={() => handleOpenDetails(row)}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
        >
          {row.studentId.name}
        </button>
      ) : <em style={{ color: 'var(--text-muted)' }}>Admitted Pupil</em>
    },
    { header: 'Roll Number', render: (row) => row.studentId ? row.studentId.rollNo : 'N/A' },
    {
      header: 'Class',
      render: (row) => row.studentId && row.studentId.class ? `${row.studentId.class.className}-${row.studentId.class.section}` : 'N/A'
    },
    { header: 'Total Invoiced ($)', accessor: 'amountDue', render: (row) => `$${row.amountDue}` },
    { header: 'Amount Paid ($)', accessor: 'amountPaid', render: (row) => `$${row.amountPaid}` },
    {
      header: 'Balance Outstanding ($)',
      render: (row) => (
        <span style={{ color: row.amountDue - row.amountPaid > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
          ${row.amountDue - row.amountPaid}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`badge ${row.status === 'Paid' ? 'badge-student' : row.status === 'Partial' ? 'badge-parent' : 'badge-admin'}`}>
          {row.status}
        </span>
      )
    }
  ];

  if (user.role !== 'admin' && user.role !== 'teacher') {
    return (
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Fees & Ledger Statements</h1>
            <p className="page-subtitle">Inspect outstanding dues, fee invoice templates, and payment slips.</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <span>Fetching account ledger...</span>
          </div>
        ) : !personalFee ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>No active billing accounts or invoice ledgers could be located for your profile.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="stats-grid">
              <div className="stats-card glass-panel border-danger">
                <div className="card-content">
                  <span className="card-title">Balance Outstanding</span>
                  <h3 className="card-value" style={{ color: 'var(--danger)' }}>
                    ${personalFee.amountDue - personalFee.amountPaid}
                  </h3>
                  <span className="card-subtitle">Immediate payment requested</span>
                </div>
                <div className="card-icon-wrapper bg-danger">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
              </div>

              <div className="stats-card glass-panel border-success">
                <div className="card-content">
                  <span className="card-title">Total Settled</span>
                  <h3 className="card-value" style={{ color: 'var(--success)' }}>
                    ${personalFee.amountPaid}
                  </h3>
                  <span className="card-subtitle">Cleared from statement invoice</span>
                </div>
                <div className="card-icon-wrapper bg-success">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>

              <div className="stats-card glass-panel border-primary">
                <div className="card-content">
                  <span className="card-title">Ledger Status</span>
                  <h3 className="card-value" style={{ textTransform: 'uppercase' }}>
                    {personalFee.status}
                  </h3>
                  <span className="card-subtitle">Updated live</span>
                </div>
                <div className="card-icon-wrapper bg-primary">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>Transaction Log Statement</h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Transaction Timestamp</th>
                      <th>Method</th>
                      <th>Reference Remarks</th>
                      <th style={{ textAlign: 'right' }}>Amount Paid</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalFee.transactions && personalFee.transactions.length > 0 ? (
                      personalFee.transactions.map((t, idx) => (
                        <tr key={t._id || idx}>
                          <td>{new Date(t.date).toLocaleString()}</td>
                          <td>{t.paymentMethod}</td>
                          <td>{t.remarks || <em style={{ color: 'var(--text-muted)' }}>None</em>}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                            ${t.amount}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenReceipt(t, personalFee.studentId)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="table-empty-state">No transaction statements could be located in your history.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showReceiptModal && selectedReceipt && (
          <div className="modal-overlay">
            <div className="modal-container glass-panel" style={{ maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3>Tuition Fee Receipt</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handlePrintReceipt} className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Print</button>
                  <button onClick={() => setShowReceiptModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
                </div>
              </div>

              <div ref={receiptPrintRef} style={{ background: '#fff', color: '#000', padding: '32px', borderRadius: '8px', border: '1px dashed #000', fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '16px', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>EDUSPHERE ACADEMY</h2>
                  <p style={{ fontSize: '0.8rem' }}>Payment Acknowledgment Receipt</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <div><strong>Receipt No:</strong> {selectedReceipt._id || 'N/A'}</div>
                  <div><strong>Date:</strong> {new Date(selectedReceipt.date).toLocaleString()}</div>
                  <div><strong>Student Name:</strong> {selectedReceipt.studentName}</div>
                  <div><strong>Roll Number:</strong> {selectedReceipt.rollNo}</div>
                  <div><strong>Class Section:</strong> {selectedReceipt.classInfo}</div>
                  <div><strong>Payment Method:</strong> {selectedReceipt.paymentMethod}</div>
                  <div><strong>Reference Memo:</strong> {selectedReceipt.remarks || 'None'}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <span>PAID AMOUNT:</span>
                  <span>${selectedReceipt.amount}.00</span>
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
          <h1 className="page-title">Financial Ledger</h1>
          <p className="page-subtitle">Track billing records, check tuition statement clearance, and log payments.</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={handleOpenPaymentModal} className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Record Payment Receipt
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={ledger}
        loading={loading}
        searchPlaceholder="Filter billing logs by pupil name, roll number, or status..."
      />

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>Record Student Payment Receipt</h3>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmitPayment}>
              <div className="form-group">
                <label className="form-label">Select Student Account</label>
                <select
                  className="form-control"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">-- Choose Pupil --</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.rollNo})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Payment Amount ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 500"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Channel</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash Receipt</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer (ACH)</option>
                    <option value="Online">Online Gateway</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Memo / Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Paid Semester 1 balance"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedLedgerEntry && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>Student Billing Profile Drawer</h3>
              <button onClick={() => setShowDetailsModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
              <div>
                <strong>Name:</strong> {selectedLedgerEntry.studentId?.name}<br />
                <strong>Roll Number:</strong> {selectedLedgerEntry.studentId?.rollNo}<br />
                <strong>Class Section:</strong> {selectedLedgerEntry.studentId?.class ? `${selectedLedgerEntry.studentId.class.className}-${selectedLedgerEntry.studentId.class.section}` : 'N/A'}
              </div>
              <div>
                <strong>Total Invoiced:</strong> ${selectedLedgerEntry.amountDue}<br />
                <strong>Total Paid:</strong> ${selectedLedgerEntry.amountPaid}<br />
                <strong>Balance Outstanding:</strong> <span style={{ color: 'var(--danger)', fontWeight: 700 }}>${selectedLedgerEntry.amountDue - selectedLedgerEntry.amountPaid}</span>
              </div>
            </div>

            <h4 style={{ marginBottom: '12px' }}>Transaction logs for student</h4>
            <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLedgerEntry.transactions && selectedLedgerEntry.transactions.length > 0 ? (
                    selectedLedgerEntry.transactions.map((t, idx) => (
                      <tr key={t._id || idx}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td>{t.paymentMethod}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>${t.amount}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenReceipt(t, selectedLedgerEntry.studentId)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="table-empty-state">No transaction logs available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowDetailsModal(false)} className="btn btn-secondary">
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && selectedReceipt && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>Tuition Fee Receipt</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handlePrintReceipt} className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Print</button>
                <button onClick={() => setShowReceiptModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
              </div>
            </div>

            <div ref={receiptPrintRef} style={{ background: '#fff', color: '#000', padding: '32px', borderRadius: '8px', border: '1px dashed #000', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '16px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>EDUSPHERE ACADEMY</h2>
                <p style={{ fontSize: '0.8rem' }}>Payment Acknowledgment Receipt</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                <div><strong>Receipt No:</strong> {selectedReceipt._id || 'N/A'}</div>
                <div><strong>Date:</strong> {new Date(selectedReceipt.date).toLocaleString()}</div>
                <div><strong>Student Name:</strong> {selectedReceipt.studentName}</div>
                <div><strong>Roll Number:</strong> {selectedReceipt.rollNo}</div>
                <div><strong>Class Section:</strong> {selectedReceipt.classInfo}</div>
                <div><strong>Payment Method:</strong> {selectedReceipt.paymentMethod}</div>
                <div><strong>Reference Memo:</strong> {selectedReceipt.remarks || 'None'}</div>
              </div>

              <div style={{ borderTop: '1px dashed #000', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span>PAID AMOUNT:</span>
                <span>${selectedReceipt.amount}.00</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
