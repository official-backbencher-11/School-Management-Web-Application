const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  registerAdmin,
  getAdmins,
  deleteAdmin,
  updateProfileImage,
  checkBootstrap,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleVerification');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/check-bootstrap', checkBootstrap);

// Protected Admin Management Routes
router.post('/register-admin', protect, authorize('admin'), registerAdmin);
router.get('/admins', protect, authorize('admin'), getAdmins);
router.delete('/admins/:id', protect, authorize('admin'), deleteAdmin);
router.put('/profile-image', protect, authorize('admin'), updateProfileImage);
router.put('/profile-image/:userId', protect, authorize('admin'), updateProfileImage);

module.exports = router;
