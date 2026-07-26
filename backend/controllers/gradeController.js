const Grade = require('../models/Grade');

// @desc    Record or update student grades
// @route   POST /api/grades/record
// @access  Private (Admin or Teacher)
const recordGrades = async (req, res) => {
  try {
    const { studentId, examName, marks } = req.body;

    if (!studentId || !examName || !marks || !Array.isArray(marks)) {
      return res.status(400).json({ success: false, message: 'Please provide studentId, examName, and marks' });
    }

    let grade = await Grade.findOne({ studentId, examName });

    if (grade) {
      grade.marks = marks;
      await grade.save();
    } else {
      grade = await Grade.create({ studentId, examName, marks });
    }

    res.status(200).json({ success: true, data: grade });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get grades for a specific student
// @route   GET /api/grades/student/:studentId
// @access  Private
const getGradesByStudent = async (req, res) => {
  try {
    const grades = await Grade.find({ studentId: req.params.studentId })
      .populate('studentId', 'name rollNo class');
    res.status(200).json({ success: true, count: grades.length, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  recordGrades,
  getGradesByStudent,
};
