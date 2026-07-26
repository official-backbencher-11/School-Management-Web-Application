const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  className: {
    type: String,
    required: [true, 'Please add a class name'],
    trim: true,
  },
  section: {
    type: String,
    required: [true, 'Please add a section'],
    trim: true,
  },
  room: {
    type: String,
    trim: true,
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
  },
}, {
  timestamps: true,
});

// Ensure className and section combination is unique
classSchema.index({ className: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
