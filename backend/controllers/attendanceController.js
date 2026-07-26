const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// @desc    Submit or update daily attendance
// @route   POST /api/attendance
// @access  Private (Admin or Teacher)
const submitAttendance = async (req, res) => {
  try {
    const { date, classId, records } = req.body;

    if (!classId || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Please provide classId and attendance records' });
    }

    // Format date to start of day
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already logged for this date and class
    let attendance = await Attendance.findOne({ date: attendanceDate, classId });

    if (attendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this day and class. It cannot be changed.'
      });
    } else {
      // Create new record
      attendance = await Attendance.create({
        date: attendanceDate,
        classId,
        records,
      });
    }

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance records by class and date
// @route   GET /api/attendance/class/:classId
// @access  Private
const getAttendanceByClassAndDate = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Fetch all active students currently enrolled in this class
    const activeStudents = await Student.find({ class: classId }).select('name rollNo');

    let attendance = await Attendance.findOne({ date: attendanceDate, classId })
      .populate('records.studentId', 'name rollNo');

    // If no record is found, return a draft structure of all active students
    if (!attendance) {
      const draftRecords = activeStudents.map(student => ({
        studentId: student,
        status: 'Present',
      }));

      return res.status(200).json({
        success: true,
        isDraft: true,
        data: {
          date: attendanceDate,
          classId,
          records: draftRecords,
        },
      });
    }

    // Self-healing merge logic:
    // 1. Filter out records for students that no longer exist in the system (studentId is null)
    let mergedRecords = attendance.records.filter(r => r.studentId !== null && r.studentId !== undefined);

    // 2. Identify active students who don't have an attendance record yet for this date
    const coveredStudentIds = mergedRecords.map(r => r.studentId._id.toString());
    const missingStudents = activeStudents.filter(s => !coveredStudentIds.includes(s._id.toString()));

    // 3. Append missing students with default 'Present' status
    const missingRecords = missingStudents.map(student => ({
      studentId: student,
      status: 'Present'
    }));

    mergedRecords = [...mergedRecords, ...missingRecords];

    res.status(200).json({
      success: true,
      isDraft: false,
      data: {
        _id: attendance._id,
        date: attendance.date,
        classId: attendance.classId,
        records: mergedRecords,
        createdAt: attendance.createdAt,
        updatedAt: attendance.updatedAt,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitAttendance,
  getAttendanceByClassAndDate,
};
