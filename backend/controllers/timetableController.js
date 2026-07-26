const Timetable = require('../models/Timetable');

// @desc    Get timetable by class section
// @route   GET /api/timetable/class/:classId
// @access  Private
const getTimetableByClass = async (req, res) => {
  try {
    const list = await Timetable.find({ classId: req.params.classId })
      .populate('slots.teacherId', 'name employeeId');
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add/Update timetable slots for a class section and day
// @route   POST /api/timetable
// @access  Private (Admin or Teacher)
const updateTimetable = async (req, res) => {
  try {
    const { classId, day, slots } = req.body;

    if (!classId || !day || !slots || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: 'Please provide classId, day, and slots list' });
    }

    let timetable = await Timetable.findOne({ classId, day });

    if (timetable) {
      timetable.slots = slots;
      await timetable.save();
    } else {
      timetable = await Timetable.create({ classId, day, slots });
    }

    timetable = await Timetable.findById(timetable._id).populate('slots.teacherId', 'name employeeId');

    res.status(200).json({ success: true, data: timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTimetableByClass,
  updateTimetable,
};
