const express = require('express');
const studentDashboardRouter = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const {
    getStudentDashboardStats,
    getStudentRecentActivities,
    getUpcomingAssignments
} = require('../controllers/studentDashboardController');

// All routes require authentication and student role
studentDashboardRouter.use(authenticateUser);
studentDashboardRouter.use(authorizeRoles(['Student']));

// Get student dashboard statistics
studentDashboardRouter.get('/stats', getStudentDashboardStats);

// Get student recent activities
studentDashboardRouter.get('/activities', getStudentRecentActivities);

// Get upcoming assignments
studentDashboardRouter.get('/upcoming-assignments', getUpcomingAssignments);

module.exports = studentDashboardRouter; 