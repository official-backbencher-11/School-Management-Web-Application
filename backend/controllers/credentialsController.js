const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

// @desc    Get all teachers and their linked user credentials
// @route   GET /api/credentials/teachers
// @access  Private/Admin
const getTeacherCredentials = async (req, res) => {
  try {
    const list = await Teacher.find()
      .populate('user', 'email role profileImage')
      .populate('classes', 'className section');
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create/Update teacher user credentials
// @route   POST /api/credentials/teachers/:teacherId
// @access  Private/Admin
const updateTeacherCredentials = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    let user = await User.findById(teacher.user);

    if (user) {
      // Check if email belongs to someone else
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email address already in use' });
      }

      user.email = email;
      if (password) {
        user.password = password; // pre-save hook will hash it
      }
      await user.save();
    } else {
      // If no linked user exists, check email, then create
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email address already in use' });
      }

      user = await User.create({
        name: teacher.name,
        email,
        password: password || '123456', // default fallback if blank
        role: 'teacher',
        profileImage: teacher.profileImage || '',
      });
      teacher.user = user._id;
      await teacher.save();
    }

    res.status(200).json({
      success: true,
      message: 'Teacher login credentials successfully updated',
      data: { email: user.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Student-Parent pairings and credentials
// @route   GET /api/credentials/student-parents
// @access  Private/Admin
const getStudentParentCredentials = async (req, res) => {
  try {
    const list = await Student.find()
      .populate('class', 'className section')
      .populate('user', 'email role profileImage')
      .populate('parentUser', 'email role profileImage');
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create/Update BOTH Student and Parent login credentials simultaneously
// @route   POST /api/credentials/student-parents/:studentId
// @access  Private/Admin
const updateStudentParentCredentials = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { studentEmail, studentPassword, parentEmail, parentPassword } = req.body;

    if (!studentEmail || !parentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Compulsory: You must specify email addresses for both the student and parent.',
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // 1. Manage Student User Account
    let studentUser = await User.findById(student.user);
    if (studentUser) {
      const emailExists = await User.findOne({ email: studentEmail, _id: { $ne: studentUser._id } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: `Student email '${studentEmail}' already in use` });
      }
      studentUser.email = studentEmail;
      if (studentPassword) {
        studentUser.password = studentPassword;
      }
      await studentUser.save();
    } else {
      const emailExists = await User.findOne({ email: studentEmail });
      if (emailExists) {
        return res.status(400).json({ success: false, message: `Student email '${studentEmail}' already in use` });
      }
      studentUser = await User.create({
        name: student.name,
        email: studentEmail,
        password: studentPassword || '123456',
        role: 'student',
      });
      student.user = studentUser._id;
    }

    // 2. Manage Parent User Account
    let parentUser = await User.findById(student.parentUser);
    if (parentUser) {
      const emailExists = await User.findOne({ email: parentEmail, _id: { $ne: parentUser._id } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: `Parent email '${parentEmail}' already in use` });
      }
      parentUser.email = parentEmail;
      if (parentPassword) {
        parentUser.password = parentPassword;
      }
      await parentUser.save();
    } else {
      const emailExists = await User.findOne({ email: parentEmail });
      if (emailExists) {
        return res.status(400).json({ success: false, message: `Parent email '${parentEmail}' already in use` });
      }
      parentUser = await User.create({
        name: student.guardianName || `${student.name} Parent`,
        email: parentEmail,
        password: parentPassword || '123456',
        role: 'parent',
      });
      student.parentUser = parentUser._id;
    }

    // Save changes to student schema mapping
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student & Parent login credentials successfully mapped and updated together.',
      data: {
        studentEmail: studentUser.email,
        parentEmail: parentUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTeacherCredentials,
  updateTeacherCredentials,
  getStudentParentCredentials,
  updateStudentParentCredentials,
};
