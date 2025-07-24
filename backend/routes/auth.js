const express = require('express');
const multer = require('multer');
const path = require('path');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads (memory storage for base64 conversion)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/upload-profile-picture', authMiddleware, (req, res, next) => {
  console.log('🖼️ Profile picture upload route hit');
  next();
}, upload.single('profilePicture'), authController.uploadProfilePicture);
router.delete('/delete-all-data', authMiddleware, authController.deleteAllUserData);

module.exports = router;