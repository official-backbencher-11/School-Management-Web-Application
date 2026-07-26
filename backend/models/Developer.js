const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    required: [true, 'Please add developer name'],
    default: 'Shivam (Developer)',
  },
  roleTitle: {
    type: String,
    default: 'Lead Full-Stack Developer',
  },
  profileImage: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: 'Welcome to EduSphere! Built with passion, clean architecture, and modern full-stack web technology stack. Feel free to reach out!',
  },
}, {
  timestamps: true,
});

const IMMUTABLE_DEVELOPER_NAMES = ['Shivam (Developer)'];

developerSchema.pre(['deleteOne', 'findOneAndDelete', 'findOneAndRemove'], async function(next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && IMMUTABLE_DEVELOPER_NAMES.includes(doc.name)) {
    return next(new Error('This developer profile is immutable and cannot be deleted.'));
  }
  next();
});

developerSchema.pre(['updateOne', 'findOneAndUpdate'], async function(next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && IMMUTABLE_DEVELOPER_NAMES.includes(doc.name)) {
    return next(new Error('This developer profile is immutable and cannot be modified.'));
  }
  next();
});

module.exports = mongoose.model('Developer', developerSchema);
