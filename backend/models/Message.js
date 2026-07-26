const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
  },
  target: {
    type: String,
    enum: ['teacher', 'admin', 'parent'],
    required: true,
  },
  recipientTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
  },
  content: {
    type: String,
    required: [true, 'Please add message content'],
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'delivered',
  },
  isReadByRecipient: {
    type: Boolean,
    default: false,
  },
  isReadBySender: {
    type: Boolean,
    default: true,
  },
  readAt: {
    type: Date,
  },
  replies: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'delivered',
    },
    date: {
      type: Date,
      default: Date.now,
    }
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Message', messageSchema);
