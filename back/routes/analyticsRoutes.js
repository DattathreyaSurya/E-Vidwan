const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
 

// Middleware to authenticate user
const { authenticateUser } = require("../middleware/auth");
router.use(authenticateUser);
// Route to fetch analytics data for a specific student
router.get("/student/:studentId", analyticsController.getAnalyticsByStudent);
router.patch('/progress/:courseId', analyticsController.updateCourseProgress);
 
module.exports = router;