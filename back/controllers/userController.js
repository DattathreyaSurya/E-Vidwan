const User = require('../models/userModel')
const Otp = require('../models/Otp');
const notificationModel = require('../models/notificationModel');
const StudentCourseAnalytics = require('../models/analyticsModel');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const InstructorAnalytics = require('../models/instructorAnalyticsModel');
const AssignmentSubmission = require('../models/assignmentSubmissionModel');
const QuizAttempt = require('../models/quizAttemptModel');
const JWT_SECRET = process.env.JWT_SECRET;
 
const EMAIL = process.env.EMAIL;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
 
// Helper function to validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%_*?&]{6,}$/;
  return passwordRegex.test(password);
};
// Helper function to send emails
const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL,
      pass: EMAIL_PASSWORD,
    },
  });
 
  const mailOptions = {
    from: EMAIL,
    to,
    subject,
    text,
  };
 
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    return true;
  } catch (error) {
    console.error("Error during email sending:", error);
    return false;
  }
};
 
const signupOTP = async (req, res) => {
  const { email } = req.body;
 
  try {
    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Invalid or missing email address." });
    }
 
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }
 
    const otpGenerated = Math.floor(100000 + Math.random() * 900000);
 
    // Save OTP in the temporary collection
    const otpEntry = await Otp.findOneAndUpdate(
      { email },
      { otp: otpGenerated, otpExpires: Date.now() + 15 * 60 * 1000 }, // OTP expires in 15 minutes
      { upsert: true, new: true }
    );
 
    // Debugging logs
    console.log("Saved OTP:", otpEntry.otp);
    console.log("Saved OTP Expiry Time:", otpEntry.otpExpires);
 
    const emailSent = await sendEmail(
      email,
      "Signup OTP Verification",
      `Your signup OTP is: ${otpGenerated}. It is valid for 15 minutes.`
    );
 
    if (emailSent) {
      res.status(200).json({ message: "OTP sent to your email for verification." });
    } else {
      res.status(500).json({ error: "Failed to send OTP. Please try again later." });
    }
  } catch (error) {
    console.error("Error during OTP sending:", error);
    res.status(500).json({ error: "Server error." });
  }
};
 
// Signup Route
const signup =  async (req, res) => {
  const { email, username, password, confirmPassword, role, otp } = req.body;
 
  try {
    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Invalid or missing email address." });
    }
 
    // Validate password
    if (!password || password.length < 6 || !validatePassword(password)) {
      return res.status(400).json({ error: "Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number." });
    }
 
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }
 
    const otpEntry = await Otp.findOne({ email });
 
    if (!otpEntry) {
      return res.status(404).json({ error: "OTP not found for verification." });
    }
 
    if (Number(otpEntry.otp) !== Number(otp) || otpEntry.otpExpires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
 
    // Hash the password and finalize signup
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      role,
    });
 
    await newUser.save();
 
    // Remove OTP entry after successful signup
    await Otp.deleteOne({ email });
 
    // Create a welcome notification
    const welcomeNotification = new notificationModel({
      userId: newUser._id,
      message: "Welcome to our platform! Your account has been created successfully.",
      type: "Welcome",
    });
    await welcomeNotification.save();
 
    // Create initial analytics entry for the user
    const analyticsEntry = new StudentCourseAnalytics({
      userId: newUser._id,
      enrolledCourses: [],
    });
 
    await analyticsEntry.save();
 
    if (role === "Instructor") {
      await InstructorAnalytics.create({
        instructor: newUser._id,
        courses: []
      })
    }
 
    res.status(201).json({ message: "Signup successful!" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ error: "Server error." });
  }
};
 
// Login Route
const login = async (req, res) => {
  const { email, password } = req.body;
 
  try {
    // Fetch user from the database
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(404).json({ error: "Invalid email or password." });
    }
 
    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password comparison result:", isPasswordValid);
 
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
 
    // Generate JWT token for authentication
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
 
    //Notification for successful login
    const loginNotification = new notificationModel({
      userId: user._id,
      message: "You have successfully logged in.",
      type: "Login Alert",
    });
    await loginNotification.save();
 
    // Respond with user data and token
    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Server error." });
  }
};
 
// Forgot Password - Send OTP
const forgotPassword = async (req, res) => {
    const { email } = req.body;
 
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found." });
 
      const otpGenerated = Math.floor(100000 + Math.random() * 900000);
 
      user.resetOtp = otpGenerated;
      user.otpExpires = Date.now() + 15 * 60 * 1000; // OTP expires in 15 minutes
      await user.save();
 
      // Debugging logs
      console.log("Saved Reset OTP:", user.resetOtp);
      console.log("Saved OTP Expiry Time:", user.otpExpires);
 
      const emailSent = await sendEmail(
        email,
        "Password Reset OTP",
        `Your password reset OTP is: ${otpGenerated}. It is valid for 15 minutes.`
      );
 
      if (emailSent) {
        res.status(200).json({ message: "OTP sent to your email." });
      } else {
        res.status(500).json({ error: "Failed to send OTP. Please try again later." });
      }
    } catch (error) {
      console.error("Error during forgot password:", error);
      res.status(500).json({ error: "Server error." });
    }
  };
 
// Forgot Password - Reset Password
const resetPassword = async (req, res) => {
    const { email, otp, newPassword, confirmPassword } = req.body;
 
    try {
      const user = await User.findOne({ email });
 
      // Debugging logs
      console.log("Retrieved User:", user);
      console.log("Provided OTP:", otp);
      console.log("Stored Reset OTP:", user.resetOtp);
      console.log("Reset OTP Expiry Time:", user.otpExpires);
      console.log("Current Time:", Date.now());
 
      if (!user) return res.status(404).json({ error: "User not found." });
 
      // Verify OTP
      if (Number(user.resetOtp) !== Number(otp) || user.otpExpires < Date.now()) {
        return res.status(400).json({ error: "Invalid or expired OTP." });
      }
 
      // Validate password
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long." });
      }
 
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
      }
 
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
 
      // Update password and clear OTP fields
      user.password = hashedPassword;
      user.resetOtp = undefined;
      user.otpExpires = undefined;
      await user.save();
 
      // Create a password reset notification
      const resetNotification = new notificationModel({
        userId: user._id,
        message: "Your password has been reset successfully.",
        type: "Password Reset",
      });
      await resetNotification.save();
 
      res.status(200).json({ message: "Password reset successful." });
    } catch (error) {
      console.error("Error during reset password:", error);
      res.status(500).json({ error: "Server error." });
    }
  };
 
const getProfileStats = async (req, res) => {
  try {
    const userId = req.user._id;
 
    // Courses completed
    const analytics = await StudentCourseAnalytics.findOne({ userId });
    const completedCourses = analytics?.enrolledCourses.filter(c => c.completionData.progress === 100) || [];
    const totalCoursesCompleted = completedCourses.length;
 
    // Quiz stats
    const quizAttempts = await QuizAttempt.find({ student: userId });
    const totalQuizzesAttempted = quizAttempts.length;
    const avgQuizScore = quizAttempts.length
      ? (quizAttempts.reduce((sum, q) => sum + (q.score || 0), 0) / quizAttempts.length).toFixed(2)
      : 0;
 
    // Assignment stats
    const assignments = await AssignmentSubmission.find({ student: userId });
    const totalAssignmentsSubmitted = assignments.length;
    const avgAssignmentGrade = assignments.length
      ? (assignments.reduce((sum, a) => sum + (a.grade || 0), 0) / assignments.length).toFixed(2)
      : 0;
 
    // Badges logic
    const badges = [];
    if (totalCoursesCompleted > 0) badges.push("First Course Completed");
    if (totalCoursesCompleted >= 5) badges.push("Course Explorer");
    if (totalCoursesCompleted >= 10) badges.push("Learning Marathon");
    if (avgQuizScore >= 90) badges.push("Top Scorer");
    if (avgQuizScore >= 75 && avgQuizScore < 90) badges.push("Quiz Pro");
    if (totalAssignmentsSubmitted >= 10) badges.push("Assignment Enthusiast");
    if (totalAssignmentsSubmitted >= 25) badges.push("Assignment Master");
    if (totalQuizzesAttempted >= 20) badges.push("Quiz Challenger");
    if (totalQuizzesAttempted >= 50) badges.push("Quiz Veteran");
    if (assignments.length > 0 && avgAssignmentGrade >= 90) badges.push("Assignment Ace");
    if (quizAttempts.length > 0 && quizAttempts.every(q => q.score === 100)) badges.push("Perfect Quizzer");
 
    res.json({
      totalCoursesCompleted,
      avgQuizScore,
      avgAssignmentGrade,
      totalAssignmentsSubmitted,
      totalQuizzesAttempted,
      badges,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile stats" });
  }
};
 
const getInstructorProfileStats = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const analytics = await InstructorAnalytics.findOne({ instructor: instructorId });
 
    const totalCoursesCreated = analytics?.courses.length || 0;
    const totalStudentsTaught = analytics
      ? analytics.courses.reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0)
      : 0;
 
    // Calculate average course completion rate
    let totalCompletion = 0, courseCount = 0;
    if (analytics && analytics.courses.length > 0) {
      for (const c of analytics.courses) {
        if (c.students && c.students.length > 0) {
          const completed = c.students.filter(s => s.courseProgress === 100).length;
          totalCompletion += (completed / c.students.length) * 100;
          courseCount++;
        }
      }
    }
    const avgCourseCompletionRate = courseCount ? (totalCompletion / courseCount).toFixed(2) : 0;
 
    // Badges logic
    const badges = [];
    if (totalCoursesCreated > 0) badges.push("First Course Published");
    if (totalCoursesCreated >= 5) badges.push("Course Creator");
    if (totalCoursesCreated >= 10) badges.push("Master Instructor");
    if (totalStudentsTaught >= 50) badges.push("Mentor");
    if (totalStudentsTaught >= 200) badges.push("Community Builder");
    if (avgCourseCompletionRate >= 80) badges.push("Engagement Star");
    if (analytics && analytics.courses.some(c => c.students && c.students.length >= 100)) badges.push("Popular Course");
 
    res.json({
      totalCoursesCreated,
      totalStudentsTaught,
      avgCourseCompletionRate,
      badges,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching instructor profile stats" });
  }
};
 
module.exports = {
  signupOTP,
  signup,
  login,
  forgotPassword,
  resetPassword,
  getProfileStats,
  getInstructorProfileStats
};