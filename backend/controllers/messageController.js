const Message = require('../models/Message');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

// @desc    Send a message (Parent contact)
// @route   POST /api/messages/send
// @access  Private (Parent only)
const sendMessage = async (req, res) => {
  try {
    const { target, recipientTeacher, studentId, content } = req.body;

    if (!target || !content) {
      return res.status(400).json({ success: false, message: 'Please specify target and message content' });
    }

    let resolvedStudentId = null;

    if (req.user.role === 'parent') {
      if (target === 'teacher' && !recipientTeacher) {
        return res.status(400).json({ success: false, message: 'Please specify the recipient teacher' });
      }
      // Identify student profile linked to this parent
      const student = await Student.findOne({ parentUser: req.user._id });
      if (!student) {
        return res.status(400).json({ success: false, message: 'No active student registry is linked to your parent credentials' });
      }
      resolvedStudentId = student._id;
    } else if (req.user.role === 'teacher') {
      if (target === 'parent') {
        if (!studentId) {
          return res.status(400).json({ success: false, message: 'Please specify the student to contact their parent' });
        }
        resolvedStudentId = studentId;
      }
    }

    const message = await Message.create({
      sender: req.user._id,
      studentId: resolvedStudentId,
      target,
      recipientTeacher: target === 'teacher' ? recipientTeacher : null,
      content,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inbox messages
// @route   GET /api/messages/inbox
// @access  Private (Admin and Teacher only)
const getInbox = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'admin') {
      // Admin sees ALL messages
      query = {};
    } else if (req.user.role === 'teacher') {
      // Teacher sees only messages addressed to them
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher profile not found' });
      }
      query = { 
        $or: [
          { target: 'teacher', recipientTeacher: teacher._id },
          { sender: req.user._id }
        ] 
      };
    } else {
      return res.status(403).json({ success: false, message: 'Access denied: role not authorized to view messages inbox' });
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('studentId', 'name rollNo')
      .populate('recipientTeacher', 'name employeeId')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reply to a particular message thread
// @route   POST /api/messages/:id/reply
// @access  Private
const replyToMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Please provide reply content' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message thread not found' });
    }

    // Verify access: Parent who created it, or recipient teacher, or admin
    const isAdmin = req.user.role === 'admin';
    const isSender = message.sender.toString() === req.user._id.toString();
    
    let isRecipientTeacher = false;
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (teacher && message.recipientTeacher && message.recipientTeacher.toString() === teacher._id.toString()) {
        isRecipientTeacher = true;
      }
    }

    if (!isAdmin && !isSender && !isRecipientTeacher) {
      return res.status(403).json({ success: false, message: 'Not authorized to reply to this thread' });
    }

    message.replies.push({
      sender: req.user._id,
      senderName: req.user.name,
      content,
      status: 'delivered',
      date: new Date(),
    });

    // Mark thread as unread for the recipient side
    if (isSender) {
      message.isReadByRecipient = false;
      message.status = 'delivered';
    } else if (isAdmin && message.target === 'teacher') {
      message.isReadBySender = false;
      message.isReadByRecipient = false;
      message.status = 'delivered';
    } else {
      message.isReadBySender = false;
    }

    await message.save();

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a message thread as read / seen
// @route   PUT /api/messages/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message thread not found' });
    }

    const isSender = message.sender.toString() === req.user._id.toString();

    if (isSender) {
      message.isReadBySender = true;
    } else {
      message.isReadByRecipient = true;
      message.status = 'seen';
      message.readAt = new Date();
    }

    // Mark replies as seen
    message.replies.forEach((r) => {
      if (r.sender.toString() !== req.user._id.toString()) {
        r.status = 'seen';
      }
    });

    await message.save();
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get total unread message bubble count for current user
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    let count = 0;
    const userId = req.user._id;

    if (req.user.role === 'parent') {
      // Parent unread: threads created by parent where isReadBySender is false
      count = await Message.countDocuments({
        sender: userId,
        isReadBySender: false,
      });
    } else if (req.user.role === 'teacher') {
      // Teacher unread: threads targeted to teacher where isReadByRecipient is false
      const teacher = await Teacher.findOne({ user: userId });
      if (teacher) {
        count = await Message.countDocuments({
          target: 'teacher',
          recipientTeacher: teacher._id,
          isReadByRecipient: false,
        });
      }
    } else if (req.user.role === 'admin') {
      // Admin unread: threads targeted to admin where isReadByRecipient is false
      count = await Message.countDocuments({
        target: 'admin',
        isReadByRecipient: false,
      });
    }

    res.status(200).json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all threads created by a parent
// @route   GET /api/messages/my-threads
// @access  Private (Parent only)
const getParentThreads = async (req, res) => {
  try {
    const list = await Message.find({ sender: req.user._id })
      .populate('recipientTeacher', 'name employeeId')
      .populate('studentId', 'name rollNo')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendMessage,
  getInbox,
  replyToMessage,
  markAsRead,
  getUnreadCount,
  getParentThreads,
};
