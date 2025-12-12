const express = require('express');
const courseRouter = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');

// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        if (req.path === '/uploadThumbnail' && !file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed for thumbnails'));
            return;
        }
        if (req.path === '/uploadContent' && !file.mimetype.startsWith('video/')) {
            cb(new Error('Only video files are allowed for content'));
            return;
        }
        cb(null, true);
    }
});

const {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    unenrollFromCourse,
    getEnrolledCourses,
    getInstructorCourses,
    uploadThumbnail,
    uploadContent
} = require('../controllers/courseController');

// Public routes
courseRouter.get('/all', getAllCourses);
courseRouter.get('/:id', getCourseById);

// Protected routes - require authentication
courseRouter.use(authenticateUser);

// File upload routes - Instructor only
courseRouter.post(
    '/uploadThumbnail',
    authorizeRoles(['Instructor']),
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    },
    uploadThumbnail
);

courseRouter.post(
    '/uploadContent',
    authorizeRoles(['Instructor']),
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    },
    uploadContent
);

// Student routes
courseRouter.get('/enrolled/me', getEnrolledCourses);
courseRouter.post('/enroll/:courseId', enrollInCourse);

// Instructor routes
courseRouter.get('/instructor/me', authorizeRoles(['Instructor']), getInstructorCourses);
courseRouter.post('/create', authorizeRoles(['Instructor']), createCourse);
courseRouter.patch('/:id', authorizeRoles(['Instructor']), updateCourse);
courseRouter.delete('/:id', authorizeRoles(['Instructor']), deleteCourse);


// Debug route - remove in production
courseRouter.get('/debug/auth', authenticateUser, (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: req.user._id,
            role: req.user.role,
            name: req.user.name,
            email: req.user.email
        }
    });
});

module.exports = courseRouter; 