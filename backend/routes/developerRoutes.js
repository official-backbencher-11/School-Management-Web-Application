const express = require('express');
const router = express.Router();
const {
  getDevelopers,
  createDeveloper,
  updateDeveloper,
  deleteDeveloper,
} = require('../controllers/developerController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleVerification');

// GET Developers page details (Public or Protected)
router.get('/', getDevelopers);

// POST Create developer (Developer or Admin)
router.post('/', protect, authorize('developer', 'admin'), createDeveloper);

// PUT Update developer details (Developer or Admin)
router.put('/:id', protect, authorize('developer', 'admin'), updateDeveloper);

// DELETE Remove developer details (Developer or Admin)
router.delete('/:id', protect, authorize('developer', 'admin'), deleteDeveloper);

module.exports = router;
