const Fee = require('../models/Fee');
const Student = require('../models/Student');

// @desc    Get all ledger entries
// @route   GET /api/fees
// @access  Private (Admin or Teacher)
const getFeeLedger = async (req, res) => {
  try {
    const fees = await Fee.find().populate({
      path: 'studentId',
      select: 'name rollNo class',
      populate: {
        path: 'class',
        select: 'className section',
      },
    });
    res.status(200).json({ success: true, count: fees.length, data: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get fee information for a single student
// @route   GET /api/fees/student/:studentId
// @access  Private
const getFeeByStudent = async (req, res) => {
  try {
    const fee = await Fee.findOne({ studentId: req.params.studentId }).populate('studentId', 'name rollNo');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee record not found for this student' });
    }
    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record a fee payment
// @route   POST /api/fees/pay
// @access  Private/Admin
const payStudentFees = async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, remarks } = req.body;

    if (!studentId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid studentId and payment amount' });
    }

    let fee = await Fee.findOne({ studentId });

    // If no fee ledger existed, initialize one
    if (!fee) {
      fee = new Fee({
        studentId,
        amountDue: 1200,
        amountPaid: 0,
        transactions: [],
      });
    }

    // Add transaction
    fee.transactions.push({
      amount: Number(amount),
      date: new Date(),
      paymentMethod: paymentMethod || 'Cash',
      remarks: remarks || '',
    });

    // Update amountPaid
    fee.amountPaid += Number(amount);

    await fee.save();

    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFeeLedger,
  getFeeByStudent,
  payStudentFees,
};
