const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  slots: [{
    subject: {
      type: String,
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
    },
    time: {
      type: String,
      required: true,
    },
    room: {
      type: String,
    },
  }],
}, {
  timestamps: true,
});

// Unique timetable per class section per day
timetableSchema.index({ classId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
