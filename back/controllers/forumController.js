const ForumPost = require('../models/forumModel');
const Course = require('../models/courseModel');
const Notification = require('../models/notificationModel');
const { createError } = require('../utils/error');
 
// Create a forum post
exports.createForumPost = async (req, res, next) => {
    try {
        const { courseId, title, content, category, tags } = req.body;
 
        // Check if the course exists and user is enrolled or is instructor
        const course = await Course.findById(courseId);
        if (!course) {
            return next(createError(404, 'Course not found'));
        }
 
        // If instructor, only allow announcement
        if (req.user.role && req.user.role.toLowerCase() === 'instructor') {
            if (category !== 'Announcement') {
                return next(createError(400, 'Instructors can only create announcements. To answer questions, reply to a student post.'));
            }
        } else {
            // If student, only allow Question or General
            if (category === 'Announcement') {
                return next(createError(400, 'Only instructors can create announcements.'));
            }
        }
 
        const post = await ForumPost.create({
            courseId,
            author: req.user._id,
            title,
            content,
            category,
            tags,
            attachments: req.body.attachments || [],
            isAnnouncement: category === 'Announcement'
        });

        // Create notification for the course instructor
        if (course.instructor.toString() !== req.user._id.toString()) {
            const instructorNotification = new Notification({
                userId: course.instructor,
                message: `New post in ${course.title} by ${req.user.username}: "${title}"`,
                type: "Forum Post",
                isRead: false
            });
            await instructorNotification.save();
        }
 
        res.status(201).json({
            success: true,
            data: post
        });
    } catch (error) {
        next(error);
    }
};
 
// Get all posts (admin only)
exports.getAllPosts = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const query = {};
 
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
 
        const posts = await ForumPost.find(query)
            .populate('author', 'name email')
            .populate('courseId', 'title')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
 
        const total = await ForumPost.countDocuments(query);
 
        res.status(200).json({
            success: true,
            data: posts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};
 
// Get post by ID
exports.getPostById = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId)
            .populate('author', 'name email')
            .populate('replies.author', 'name email')
            .populate('courseId', 'title');
 
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        // Check if user has access to the course
        const course = await Course.findById(post.courseId);
        if (!course.enrolledStudents.some(
            (student) => student._id.toString() === req.user._id.toString()
          ) &&
            course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You do not have access to this post'));
        }
 
        res.status(200).json({
            success: true,
            data: post
        });
    } catch (error) {
        next(error);
    }
};
 
// Update post
exports.updatePost = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        // Check if user is the author
        if (post.author.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You are not authorized to update this post'));
        }
 
        const updatedPost = await ForumPost.findByIdAndUpdate(
            req.params.postId,
            {
                title: req.body.title,
                content: req.body.content,
                category: req.body.category,
                tags: req.body.tags,
                attachments: req.body.attachments
            },
            { new: true, runValidators: true }
        );
 
        res.status(200).json({
            success: true,
            data: updatedPost
        });
    } catch (error) {
        next(error);
    }
};
 
// Delete post
exports.deletePost = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        // Check if user is the author or instructor
        const course = await Course.findById(post.courseId);
        if (post.author.toString() !== req.user._id.toString() &&
            course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You are not authorized to delete this post'));
        }
 
        await post.remove();
 
        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
 
// Get course discussions
exports.getCourseDiscussions = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { page = 1, limit = 10, category, search } = req.query;
 
        // Check if user has access to the course
        const course = await Course.findById(courseId);
        if (!course) {
            return next(createError(404, 'Course not found'));
        }
 
        if (!course.enrolledStudents.some(
            (student) => student._id.toString() === req.user._id.toString()
          ) &&
            course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You do not have access to this course'));
        }
 
        const query = { courseId };
 
        if (category) {
            query.category = category;
        }
 
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
 
        console.log('Current user role:', req.user.role); // Debug log
 
        const posts = await ForumPost.find(query)
            .populate({
                path: 'author',
                select: 'name email role'
            })
            .populate({
                path: 'replies.author',
                select: 'name email role'
            })
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ isPinned: -1, createdAt: -1 });
 
        // Debug log for the first post's replies
        if (posts.length > 0 && posts[0].replies.length > 0) {
            console.log('Sample reply author:', posts[0].replies[0].author);
        }
 
        const total = await ForumPost.countDocuments(query);
 
        res.status(200).json({
            success: true,
            data: posts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};
 
// Toggle like on post
exports.toggleLikePost = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        const likeIndex = post.likes.indexOf(req.user._id);
        if (likeIndex === -1) {
            post.likes.push(req.user._id);
        } else {
            post.likes.splice(likeIndex, 1);
        }
 
        await post.save();
 
        res.status(200).json({
            success: true,
            data: {
                likes: post.likes.length,
                isLiked: likeIndex === -1
            }
        });
    } catch (error) {
        next(error);
    }
};
 
// Toggle like on reply
exports.toggleLikeReply = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        const reply = post.replies.id(req.params.replyId);
        if (!reply) {
            return next(createError(404, 'Reply not found'));
        }
 
        const likeIndex = reply.likes.indexOf(req.user._id);
        if (likeIndex === -1) {
            reply.likes.push(req.user._id);
        } else {
            reply.likes.splice(likeIndex, 1);
        }
 
        await post.save();
 
        res.status(200).json({
            success: true,
            data: {
                likes: reply.likes.length,
                isLiked: likeIndex === -1
            }
        });
    } catch (error) {
        next(error);
    }
};
 
// Get announcements
exports.getAnnouncements = async (req, res, next) => {
    try {
        const { courseId } = req.query;
        const query = { category: 'Announcement' };
 
        if (courseId) {
            // Check if user has access to the course
            const course = await Course.findById(courseId);
            if (!course) {
                return next(createError(404, 'Course not found'));
            }
 
            if (!course.enrolledStudents.some(
                (student) => student._id.toString() === req.user._id.toString()
              ) &&
                course.instructor.toString() !== req.user._id.toString()) {
                return next(createError(403, 'You do not have access to this course'));
            }
 
            query.courseId = courseId;
        }
 
        const announcements = await ForumPost.find(query)
            .populate('author', 'name email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });
 
        res.status(200).json({
            success: true,
            data: announcements
        });
    } catch (error) {
        next(error);
    }
};
 
// Create announcement (instructor only)
exports.createAnnouncement = async (req, res, next) => {
    try {
        const { courseId, title, content } = req.body;
 
        // Check if the course exists and user is instructor
        const course = await Course.findById(courseId);
        if (!course) {
            return next(createError(404, 'Course not found'));
        }
 
        if (course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'Only instructors can create announcements'));
        }
 
        const announcement = await ForumPost.create({
            courseId,
            author: req.user._id,
            title,
            content,
            category: 'Announcement',
            attachments: req.body.attachments || []
        });
 
        // Create notification for all enrolled students
 
        if (course.enrolledStudents && course.enrolledStudents.length > 0) {
            const announcementStudentNotifications = course.enrolledStudents.map(studentObj => ({
                userId: studentObj._id,
                message: `New announcement in ${course.title}: "${title}"`,
                type: "Announcement",
                isRead: false,
                createdAt: new Date()
            }));
            await Notification.insertMany(announcementStudentNotifications);
        }
 
        // Create notification for the instructor
        const instructorAnnouncementNotification = new Notification({
            userId: course.instructor,
            message: `You created a new announcement in ${course.title}: "${title}"`,
            type: "Announcement",
            isRead: false
        });
        await instructorAnnouncementNotification.save();
 
        res.status(201).json({
            success: true,
            data: announcement
        });
    } catch (error) {
        next(error);
    }
};
 
// Pin/Unpin post (instructor only)
exports.pinPost = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        // Check if user is the course instructor
        const course = await Course.findById(post.courseId);
        if (course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'Only instructors can pin/unpin posts'));
        }
 
        post.isPinned = !post.isPinned;
        await post.save();
 
        res.status(200).json({
            success: true,
            data: {
                isPinned: post.isPinned
            }
        });
    } catch (error) {
        next(error);
    }
};
 
// Get user's posts
exports.getMyPosts = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
 
        const posts = await ForumPost.find({ author: req.user._id })
            .populate('courseId', 'title')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
 
        const total = await ForumPost.countDocuments({ author: req.user._id });
 
        res.status(200).json({
            success: true,
            data: posts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};
 
// Add reply to post
exports.addReply = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        // Check if user has access to the course
        const course = await Course.findById(post.courseId);
        if (!course.enrolledStudents.some(
            (student) => student._id.toString() === req.user._id.toString()
          ) &&
            course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You are not authorized to reply to this post'));
        }
 
        console.log('User adding reply:', req.user); // Debug log
 
        const reply = {
            author: req.user._id,
            content: req.body.content,
            attachments: req.body.attachments || []
        };
 
        post.replies.push(reply);
        await post.save();
 
        // Populate the author details for the new reply
        const populatedPost = await ForumPost.findById(post._id)
            .populate({
                path: 'replies.author',
                select: 'name email role'
            });
        const newReply = populatedPost.replies[populatedPost.replies.length - 1];
 
        console.log('New reply with author:', newReply); // Debug log
 
        // Create notification for the post author
        const authorForumNotification = new Notification({
            userId: post.author,
            message: `You have a new reply on your post "${post.title} from ${req.user.username} in ${course.title}"`,
            type: "Forum Reply",
            isRead: false
        });
        await authorForumNotification.save();
 
        res.status(201).json({
            success: true,
            data: newReply
        });
    } catch (error) {
        next(error);
    }
};
 
// Update reply
exports.updateReply = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        const reply = post.replies.id(req.params.replyId);
        if (!reply) {
            return next(createError(404, 'Reply not found'));
        }
 
        // Check if user is the reply author
        if (reply.author.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You are not authorized to update this reply'));
        }
 
        reply.content = req.body.content;
        reply.attachments = req.body.attachments || reply.attachments;
        reply.updatedAt = Date.now();
 
        await post.save();
 
        res.status(200).json({
            success: true,
            data: reply
        });
    } catch (error) {
        next(error);
    }
};
 
// Delete reply
exports.deleteReply = async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.postId);
        if (!post) {
            return next(createError(404, 'Post not found'));
        }
 
        const reply = post.replies.id(req.params.replyId);
        if (!reply) {
            return next(createError(404, 'Reply not found'));
        }
 
        // Check if user is the reply author or course instructor
        const course = await Course.findById(post.courseId);
        if (reply.author.toString() !== req.user._id.toString() &&
            course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You are not authorized to delete this reply'));
        }
 
        reply.remove();
        await post.save();
 
        res.status(200).json({
            success: true,
            message: 'Reply deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};