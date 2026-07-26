const ClassSubject = require('../models/ClassSubject');

// @desc    Get all class subjects
// @route   GET /api/class-subjects
// @access  Private
const getClassSubjects = async (req, res) => {
  try {
    const list = await ClassSubject.find();
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add/Update subjects for a Class Name
// @route   POST /api/class-subjects
// @access  Private/Admin
const createClassSubjects = async (req, res) => {
  try {
    const { className, subjects } = req.body;

    if (!className || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ success: false, message: 'Please provide className and subjects array' });
    }

    let classSubject = await ClassSubject.findOne({ className });

    if (classSubject) {
      classSubject.subjects = subjects;
      await classSubject.save();
    } else {
      classSubject = await ClassSubject.create({ className, subjects });
    }

    res.status(200).json({ success: true, data: classSubject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete subjects mapping for a Class Name
// @route   DELETE /api/class-subjects/:id
// @access  Private/Admin
const deleteClassSubjects = async (req, res) => {
  try {
    const classSubject = await ClassSubject.findById(req.params.id);
    if (!classSubject) {
      return res.status(404).json({ success: false, message: 'Class subjects registry entry not found' });
    }
    await classSubject.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClassSubjects,
  createClassSubjects,
  deleteClassSubjects,
};
