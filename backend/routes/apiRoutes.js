const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleVerification');

// Import Controllers
const {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
} = require('../controllers/classController');

const {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

const {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require('../controllers/teacherController');

const {
  submitAttendance,
  getAttendanceByClassAndDate,
} = require('../controllers/attendanceController');

const {
  getFeeLedger,
  getFeeByStudent,
  payStudentFees,
} = require('../controllers/feeController');

// Import Phase 2 Controllers
const {
  getClassSubjects,
  createClassSubjects,
  deleteClassSubjects,
} = require('../controllers/classSubjectController');

const {
  getTimetableByClass,
  updateTimetable,
} = require('../controllers/timetableController');

const {
  recordGrades,
  getGradesByStudent,
} = require('../controllers/gradeController');

const {
  sendMessage,
  getInbox,
  replyToMessage,
  markAsRead,
  getUnreadCount,
  getParentThreads,
} = require('../controllers/messageController');

// Import Phase 3 Credentials Controllers
const {
  getTeacherCredentials,
  updateTeacherCredentials,
  getStudentParentCredentials,
  updateStudentParentCredentials,
} = require('../controllers/credentialsController');

// --- Class Routes ---
router.route('/classes')
  .get(protect, getClasses)
  .post(protect, authorize('admin'), createClass);
router.route('/classes/:id')
  .put(protect, authorize('admin'), updateClass)
  .delete(protect, authorize('admin'), deleteClass);

// --- Student Routes ---
router.route('/students')
  .get(protect, getStudents)
  .post(protect, authorize('admin'), createStudent);
router.route('/students/:id')
  .put(protect, authorize('admin'), updateStudent)
  .delete(protect, authorize('admin'), deleteStudent);

// --- Teacher Routes ---
router.route('/teachers')
  .get(protect, getTeachers)
  .post(protect, authorize('admin'), createTeacher);
router.route('/teachers/:id')
  .put(protect, authorize('admin'), updateTeacher)
  .delete(protect, authorize('admin'), deleteTeacher);

// --- Attendance Routes ---
router.route('/attendance')
  .post(protect, authorize('admin', 'teacher'), submitAttendance);
router.route('/attendance/class/:classId')
  .get(protect, getAttendanceByClassAndDate);

// --- Fee Routes ---
router.route('/fees')
  .get(protect, authorize('admin', 'teacher'), getFeeLedger);
router.route('/fees/student/:studentId')
  .get(protect, getFeeByStudent);
router.route('/fees/pay')
  .post(protect, authorize('admin'), payStudentFees);

// --- Class Subjects Routes ---
router.route('/class-subjects')
  .get(protect, getClassSubjects)
  .post(protect, authorize('admin'), createClassSubjects);
router.route('/class-subjects/:id')
  .delete(protect, authorize('admin'), deleteClassSubjects);

// --- Timetable Routes ---
router.route('/timetable')
  .post(protect, authorize('admin', 'teacher'), updateTimetable);
router.route('/timetable/class/:classId')
  .get(protect, getTimetableByClass);

// --- Grades & Marks Routes ---
router.route('/grades/record')
  .post(protect, authorize('admin', 'teacher'), recordGrades);
router.route('/grades/student/:studentId')
  .get(protect, getGradesByStudent);

// --- Messages Routes ---
router.route('/messages/send')
  .post(protect, authorize('parent', 'teacher'), sendMessage);
router.route('/messages/inbox')
  .get(protect, authorize('admin', 'teacher'), getInbox);
router.route('/messages/my-threads')
  .get(protect, authorize('parent'), getParentThreads);
router.route('/messages/unread-count')
  .get(protect, getUnreadCount);
router.route('/messages/:id/read')
  .put(protect, markAsRead);
router.route('/messages/:id/reply')
  .post(protect, replyToMessage);

// --- Credentials Management Routes ---
router.route('/credentials/teachers')
  .get(protect, authorize('admin'), getTeacherCredentials);
router.route('/credentials/teachers/:teacherId')
  .post(protect, authorize('admin'), updateTeacherCredentials);
router.route('/credentials/student-parents')
  .get(protect, authorize('admin'), getStudentParentCredentials);
router.route('/credentials/student-parents/:studentId')
  .post(protect, authorize('admin'), updateStudentParentCredentials);

module.exports = router;
