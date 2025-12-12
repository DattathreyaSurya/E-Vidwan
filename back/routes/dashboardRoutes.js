const express = require('express');
const dashboardRouter = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const {
    getDashboardStats,
    getRecentActivities
} = require('../controllers/dashboardController');

// All routes require authentication and instructor role
dashboardRouter.use(authenticateUser);
dashboardRouter.use(authorizeRoles(['Instructor']));

// Get dashboard statistics
dashboardRouter.get('/stats', getDashboardStats);

// Get recent activities
dashboardRouter.get('/activities', getRecentActivities);

module.exports = dashboardRouter; 