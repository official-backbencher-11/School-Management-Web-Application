const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  examName: {
    type: String,
    required: true,
    trim: true,
  },
  marks: [{
    subject: {
      type: String,
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
    },
    maxMarks: {
      type: Number,
      required: true,
      default: 100,
    },
  }],
}, {
  timestamps: true,
});

gradeSchema.index({ studentId: 1, examName: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);
