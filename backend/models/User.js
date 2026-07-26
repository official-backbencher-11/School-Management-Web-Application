const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const IMMUTABLE_EMAILS = ['shivam_admin@gmail.com', 'developershivam@gmail.com'];

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'teacher', 'student', 'parent', 'developer'],
    default: 'student',
  },
  isPermanent: {
    type: Boolean,
    default: false,
  },
  profileImage: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Immutability Hooks
userSchema.pre('save', function(next) {
  if (!this.isNew && IMMUTABLE_EMAILS.includes(this.email)) {
    // Only allow password updates for immutable accounts, optionally. Or block entirely.
    // We will block all modifications except by raw DB queries
    return next(new Error('This account is immutable and cannot be modified.'));
  }
  next();
});

userSchema.pre(['deleteOne', 'findOneAndDelete', 'findOneAndRemove'], async function(next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && IMMUTABLE_EMAILS.includes(doc.email)) {
    return next(new Error('This account is immutable and cannot be deleted.'));
  }
  next();
});

userSchema.pre(['updateOne', 'findOneAndUpdate'], async function(next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && IMMUTABLE_EMAILS.includes(doc.email)) {
    return next(new Error('This account is immutable and cannot be modified.'));
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
