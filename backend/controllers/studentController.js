const Student = require('../models/Student');
const Fee = require('../models/Fee');
const User = require('../models/User');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
const getStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate({
        path: 'class',
        select: 'className section room',
      })
      .populate('user', 'email role profileImage')
      .populate('parentUser', 'email role profileImage');
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create/Admit a new student
// @route   POST /api/students
// @access  Private/Admin
const createStudent = async (req, res) => {
  try {
    const {
      name,
      rollNo,
      classId,
      dateOfBirth,
      gender,
      guardianName,
      guardianPhone,
      amountDue,
      email,
      password,
      parentEmail,
      parentPassword,
      profileImage,
      parentProfileImage,
    } = req.body;

    // Check if rollNo already exists
    const rollNoExists = await Student.findOne({ rollNo });
    if (rollNoExists) {
      return res.status(400).json({ success: false, message: `Student with Roll Number ${rollNo} already exists` });
    }

    // 1. Create Student User credentials if provided
    let userId = null;
    if (email && password) {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'Email already registered for student login credentials' });
      }

      const user = await User.create({
        name,
        email,
        password,
        role: 'student',
        profileImage: profileImage || '',
      });
      userId = user._id;
    }

    // 2. Create Parent User credentials if provided
    let parentUserId = null;
    if (parentEmail && parentPassword) {
      const parentExists = await User.findOne({ email: parentEmail });
      if (parentExists) {
        return res.status(400).json({ success: false, message: 'Parent email already registered for login credentials' });
      }

      const parentUser = await User.create({
        name: guardianName || `${name} Parent`,
        email: parentEmail,
        password: parentPassword,
        role: 'parent',
        profileImage: parentProfileImage || '',
      });
      parentUserId = parentUser._id;
    }

    // 3. Create Student profile
    const student = await Student.create({
      user: userId,
      parentUser: parentUserId,
      name,
      rollNo,
      class: classId,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      guardianName: guardianName || '',
      guardianPhone: guardianPhone || '',
      profileImage: profileImage || '',
      parentProfileImage: parentProfileImage || '',
    });

    // Automatically create Fee Ledger for student
    const defaultFee = amountDue !== undefined ? Number(amountDue) : 1200; // Default class fee
    await Fee.create({
      studentId: student._id,
      amountDue: defaultFee,
      amountPaid: 0,
      status: 'Unpaid',
      transactions: [],
    });

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student details
// @route   PUT /api/students/:id
// @access  Private/Admin
const updateStudent = async (req, res) => {
  try {
    const {
      name,
      rollNo,
      classId,
      dateOfBirth,
      gender,
      guardianName,
      guardianPhone,
      profileImage,
      parentProfileImage,
    } = req.body;

    let student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if roll number changed and is already taken
    if (rollNo && rollNo !== student.rollNo) {
      const rollExists = await Student.findOne({ rollNo });
      if (rollExists) {
        return res.status(400).json({ success: false, message: 'Roll number already in use' });
      }
    }

    const updatedData = {
      name,
      rollNo,
      class: classId,
      dateOfBirth: dateOfBirth || student.dateOfBirth,
      gender: gender || student.gender,
      guardianName: guardianName || student.guardianName,
      guardianPhone: guardianPhone || student.guardianPhone,
    };

    if (profileImage !== undefined) {
      updatedData.profileImage = profileImage;
      if (student.user) {
        await User.findByIdAndUpdate(student.user, { profileImage: profileImage });
      }
    }

    if (parentProfileImage !== undefined) {
      updatedData.parentProfileImage = parentProfileImage;
      if (student.parentUser) {
        await User.findByIdAndUpdate(student.parentUser, { profileImage: parentProfileImage });
      }
    }

    student = await Student.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Delete associated User account if any
    if (student.user) {
      await User.findByIdAndDelete(student.user);
    }

    // Delete fee record
    await Fee.findOneAndDelete({ studentId: student._id });

    await student.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};
