const express = require('express');
const forumRouter = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const {
    createForumPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost,
    addReply,
    updateReply,
    deleteReply,
    getCourseDiscussions,
    toggleLikePost,
    toggleLikeReply,
    getAnnouncements,
    createAnnouncement,
    pinPost,
    getMyPosts
} = require('../controllers/forumController');
 
// Protected routes - require authentication
forumRouter.use(authenticateUser);
 
// General forum routes
forumRouter.get('/course/:courseId', getCourseDiscussions);
forumRouter.get('/my-posts', getMyPosts);
forumRouter.get('/announcements', getAnnouncements);
forumRouter.get('/:postId', getPostById);
forumRouter.post('/create', createForumPost);
forumRouter.put('/:postId', updatePost);
forumRouter.delete('/:postId', deletePost);
 
// Reply routes
forumRouter.post('/:postId/reply', addReply);
forumRouter.put('/:postId/reply/:replyId', updateReply);
forumRouter.delete('/:postId/reply/:replyId', deleteReply);
 
// Interaction routes
forumRouter.post('/:postId/like', toggleLikePost);
forumRouter.post('/:postId/reply/:replyId/like', toggleLikeReply);
 
// Instructor/Admin only routes
forumRouter.post('/announcement', authorizeRoles(['Instructor']), createAnnouncement);
forumRouter.put('/:postId/pin', authorizeRoles(['Instructor']), pinPost);
forumRouter.get('/all', authorizeRoles(['Instructor']), getAllPosts);
 
module.exports = forumRouter;