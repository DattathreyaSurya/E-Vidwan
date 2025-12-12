
const express = require('express');
const userRouter = express.Router();
const User = require('../models/userModel.js');
const { authenticateUser } = require('../middleware/auth.js');

const { signupOTP, signup, login, forgotPassword, resetPassword, getProfileStats, getInstructorProfileStats } = require('../controllers/userController.js')

// Send otp sign up
userRouter.post("/send-otp", signupOTP);

// Signup Route
userRouter.post("/signup", signup);

// Login Route
userRouter.post("/login", login);

// Forgot Password - Send OTP
userRouter.post("/forgot-password",forgotPassword);

// Forgot Password - Reset Password
userRouter.post("/reset-password", resetPassword);

userRouter.get('/profile', authenticateUser, async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .populate('enrolledCourses.course', 'title')
        .populate('createdCourses', 'title');
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });


userRouter.get('/profile/stats', authenticateUser, getProfileStats);

userRouter.get('/profile/instructor-stats', authenticateUser, getInstructorProfileStats);

module.exports = userRouter;