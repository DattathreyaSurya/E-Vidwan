const express = require('express');
const chatRouter = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
    getConversation,
    getRecentConversations,
    markAsRead,
    getUnreadCount,
    deleteMessage,
    getCourseParticipants
} = require('../controllers/chatController');

// Protected routes - require authentication
chatRouter.use(authenticateUser);

// Get conversation between two users in a course
chatRouter.get('/conversation/:courseId/:userId', getConversation);

// Get recent conversations for a course
chatRouter.get('/recent/:courseId', getRecentConversations);

// Mark messages as read
chatRouter.put('/read/:messageId', markAsRead);

// Get unread messages count
chatRouter.get('/unread', getUnreadCount);

// Delete a message (only sender can delete)
chatRouter.delete('/:messageId', deleteMessage);

// Get course participants for chat
chatRouter.get('/participants/:courseId', getCourseParticipants);

module.exports = chatRouter; 