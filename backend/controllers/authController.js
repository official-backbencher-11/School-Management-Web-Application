const User = require('../models/User');
const { generateToken } = require('../utils/tokenGenerators');

// @desc    Register a new user (Public)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Public registration is disabled. An administrator must register and configure all system credentials.'
      });
    }

    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const targetRole = role || 'student';

    // Restrict public administrator registration
    if (targetRole === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount > 0) {
        return res.status(403).json({
          success: false,
          message: 'Public administrator registration is disabled. An existing admin must register you.',
        });
      }
    }

    // Create user
    // The very first admin created in the database gets the isPermanent flag
    const isFirstAdmin = targetRole === 'admin';
    const user = await User.create({
      name,
      email,
      password,
      role: targetRole,
      isPermanent: isFirstAdmin,
    });

    if (user) {
      res.status(201).json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPermanent: user.isPermanent,
        profileImage: user.profileImage || '',
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      let userProfileImage = user.profileImage || '';
      
      if (!userProfileImage) {
        if (user.role === 'student' || user.role === 'parent') {
          const Student = require('../models/Student');
          const st = await Student.findOne({ $or: [{ user: user._id }, { parentUser: user._id }] });
          if (st) {
            userProfileImage = (user.role === 'parent' ? st.parentProfileImage : st.profileImage) || st.profileImage || '';
          }
        } else if (user.role === 'teacher') {
          const Teacher = require('../models/Teacher');
          const tch = await Teacher.findOne({ user: user._id });
          if (tch) {
            userProfileImage = tch.profileImage || '';
          }
        } else if (user.role === 'developer') {
          const Developer = require('../models/Developer');
          const dev = await Developer.findOne({ user: user._id });
          if (dev) {
            userProfileImage = dev.profileImage || '';
          }
        }
      }

      res.json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPermanent: user.isPermanent,
        profileImage: userProfileImage,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const userObj = req.user.toObject();

    if (!userObj.profileImage) {
      if (userObj.role === 'student' || userObj.role === 'parent') {
        const Student = require('../models/Student');
        const st = await Student.findOne({ $or: [{ user: userObj._id }, { parentUser: userObj._id }] });
        if (st) {
          userObj.profileImage = (userObj.role === 'parent' ? st.parentProfileImage : st.profileImage) || st.profileImage || '';
        }
      } else if (userObj.role === 'teacher') {
        const Teacher = require('../models/Teacher');
        const tch = await Teacher.findOne({ user: userObj._id });
        if (tch) {
          userObj.profileImage = tch.profileImage || '';
        }
      } else if (userObj.role === 'developer') {
        const Developer = require('../models/Developer');
        const dev = await Developer.findOne({ user: userObj._id });
        if (dev) {
          userObj.profileImage = dev.profileImage || '';
        }
      }
    }

    res.status(200).json({
      success: true,
      data: userObj,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new administrator (Admin only)
// @route   POST /api/auth/register-admin
// @access  Private/Admin
const registerAdmin = async (req, res) => {
  try {
    if (!req.user || !req.user.isPermanent) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only the primary bootstrap administrator account can register other administrators.'
      });
    }

    const { name, email, password, profileImage } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      isPermanent: false,
      profileImage: profileImage || '',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isPermanent: admin.isPermanent,
        profileImage: admin.profileImage || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all administrator accounts (Admin only)
// @route   GET /api/auth/admins
// @access  Private/Admin
const getAdmins = async (req, res) => {
  try {
    const list = await User.find({ role: 'admin' }).select('-password');
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an administrator account (Admin only)
// @route   DELETE /api/auth/admins/:id
// @access  Private/Admin
const deleteAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isPermanent) {
      return res.status(400).json({
        success: false,
        message: 'Action Denied: This is the primary system administrator and cannot be modified or deleted.',
      });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile image (Admin only)
// @route   PUT /api/auth/profile-image/:userId?
// @access  Private/Admin
const updateProfileImage = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can update profile images.' });
    }

    const targetUserId = req.params.userId || req.user._id;
    const { profileImage } = req.body;

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { profileImage: profileImage || '' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const checkBootstrap = async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    res.status(200).json({ success: true, initialized: adminCount > 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  registerAdmin,
  getAdmins,
  deleteAdmin,
  updateProfileImage,
  checkBootstrap,
};
