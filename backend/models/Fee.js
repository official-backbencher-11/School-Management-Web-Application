const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
  },
  amountDue: {
    type: Number,
    required: true,
    default: 0,
  },
  amountPaid: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Paid', 'Partial', 'Unpaid'],
    default: 'Unpaid',
  },
  transactions: [{
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer', 'Online'],
      default: 'Cash',
    },
    remarks: {
      type: String,
      trim: true,
    },
  }],
}, {
  timestamps: true,
});

// Update fee status before saving based on amounts
feeSchema.pre('save', function (next) {
  if (this.amountPaid === 0) {
    this.status = 'Unpaid';
  } else if (this.amountPaid >= this.amountDue) {
    this.status = 'Paid';
  } else {
    this.status = 'Partial';
  }
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
