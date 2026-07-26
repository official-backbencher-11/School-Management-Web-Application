const Class = require('../models/Class');
const Teacher = require('../models/Teacher');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
const getClasses = async (req, res) => {
  try {
    const classes = await Class.find().populate({
      path: 'classTeacher',
      select: 'name employeeId',
    });
    res.status(200).json({ success: true, count: classes.length, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a class
// @route   POST /api/classes
// @access  Private/Admin
const createClass = async (req, res) => {
  try {
    const { className, section, room, classTeacher } = req.body;

    // Check if class section exists
    const classExists = await Class.findOne({ className, section });
    if (classExists) {
      return res.status(400).json({ success: false, message: 'Class section already exists' });
    }

    const newClass = await Class.create({
      className,
      section,
      room,
      classTeacher: classTeacher || null,
    });

    // If teacher is assigned, update teacher's classes list
    if (classTeacher) {
      await Teacher.findByIdAndUpdate(classTeacher, {
        $addToSet: { classes: newClass._id },
      });
    }

    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a class
// @route   PUT /api/classes/:id
// @access  Private/Admin
const updateClass = async (req, res) => {
  try {
    const { className, section, room, classTeacher } = req.body;
    
    let schoolClass = await Class.findById(req.params.id);
    if (!schoolClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const oldTeacher = schoolClass.classTeacher;

    schoolClass = await Class.findByIdAndUpdate(
      req.params.id,
      { className, section, room, classTeacher: classTeacher || null },
      { new: true, runValidators: true }
    );

    // Sync Teacher models
    if (oldTeacher && oldTeacher.toString() !== classTeacher) {
      await Teacher.findByIdAndUpdate(oldTeacher, {
        $pull: { classes: schoolClass._id },
      });
    }

    if (classTeacher) {
      await Teacher.findByIdAndUpdate(classTeacher, {
        $addToSet: { classes: schoolClass._id },
      });
    }

    res.status(200).json({ success: true, data: schoolClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
const deleteClass = async (req, res) => {
  try {
    const schoolClass = await Class.findById(req.params.id);
    if (!schoolClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Remove from teacher references
    if (schoolClass.classTeacher) {
      await Teacher.findByIdAndUpdate(schoolClass.classTeacher, {
        $pull: { classes: schoolClass._id },
      });
    }

    await schoolClass.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
};
