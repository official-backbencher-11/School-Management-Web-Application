const mongoose = require('mongoose');

const classSubjectSchema = new mongoose.Schema({
  className: {
    type: String,
    required: [true, 'Please add a class name'],
    unique: true,
    trim: true,
  },
  subjects: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('ClassSubject', classSubjectSchema);
