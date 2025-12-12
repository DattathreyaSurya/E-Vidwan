// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { getNotifications, markAllAsRead, markAsRead, deleteNotification, deleteAllNotifications } = require('../controllers/notificationController');

router.use(authenticateUser);

// Get all notifications for the logged-in user
router.get('/my', getNotifications);

// Mark a notification as read
router.post('/:id/read', markAsRead);

// Mark all notifications as read
router.post('/mark-all-read', markAllAsRead);

router.delete('/:notificationId', deleteNotification);

router.delete('/', deleteAllNotifications);


module.exports = router;