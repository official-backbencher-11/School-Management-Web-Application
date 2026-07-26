const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Class = require('../models/Class');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private
const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate('user', 'email role profileImage')
      .populate('classes', 'className section');
    res.status(200).json({ success: true, count: teachers.length, data: teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a teacher (and their associated User credentials)
// @route   POST /api/teachers
// @access  Private/Admin
const createTeacher = async (req, res) => {
  try {
    const { name, email, password, employeeId, subjects, classes, profileImage } = req.body;

    // Check if employeeId exists
    const employeeIdExists = await Teacher.findOne({ employeeId });
    if (employeeIdExists) {
      return res.status(400).json({ success: false, message: 'Employee ID already exists' });
    }

    // Check if user email already exists if provided
    let userId = null;
    if (email) {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({
        name,
        email,
        password: password || '123456',
        role: 'teacher',
        profileImage: profileImage || '',
      });
      userId = user._id;
    }

    // 2. Create Teacher profile
    const teacher = await Teacher.create({
      user: userId,
      name,
      employeeId,
      subjects: subjects || [],
      classes: classes || [],
      profileImage: profileImage || '',
    });

    // 3. Update designated Classes to reference this teacher as classTeacher
    if (classes && classes.length > 0) {
      await Class.updateMany(
        { _id: { $in: classes } },
        { $set: { classTeacher: teacher._id } }
      );
    }

    res.status(201).json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update teacher profile
// @route   PUT /api/teachers/:id
// @access  Private/Admin
const updateTeacher = async (req, res) => {
  try {
    const { name, employeeId, subjects, classes, profileImage } = req.body;

    let teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Handle employeeId check
    if (employeeId && employeeId !== teacher.employeeId) {
      const empExists = await Teacher.findOne({ employeeId });
      if (empExists) {
        return res.status(400).json({ success: false, message: 'Employee ID already in use' });
      }
    }

    // Update teacher profile
    const oldClasses = teacher.classes;
    const updatedData = {
      name,
      employeeId,
      subjects: subjects || teacher.subjects,
      classes: classes || teacher.classes,
    };

    if (profileImage !== undefined) {
      updatedData.profileImage = profileImage;
      if (teacher.user) {
        await User.findByIdAndUpdate(teacher.user, { profileImage });
      }
    }
    
    teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    // Sync Classes:
    // Remove classTeacher reference from old classes that are no longer assigned
    if (classes) {
      const removedClasses = oldClasses.filter(c => !classes.includes(c.toString()));
      if (removedClasses.length > 0) {
        await Class.updateMany(
          { _id: { $in: removedClasses } },
          { $unset: { classTeacher: '' } }
        );
      }

      // Assign classTeacher reference to new classes
      if (classes.length > 0) {
        await Class.updateMany(
          { _id: { $in: classes } },
          { $set: { classTeacher: teacher._id } }
        );
      }
    }

    res.status(200).json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Delete linked user credentials
    await User.findByIdAndDelete(teacher.user);

    // Remove from Class references
    await Class.updateMany(
      { classTeacher: teacher._id },
      { $unset: { classTeacher: '' } }
    );

    await teacher.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
