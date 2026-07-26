const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
    },
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  records: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late'],
      default: 'Present',
    },
  }],
}, {
  timestamps: true,
});

// Ensure a single class has only one attendance entry per date
attendanceSchema.index({ date: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
