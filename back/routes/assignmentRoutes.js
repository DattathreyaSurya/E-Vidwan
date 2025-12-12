const express = require('express');
const multer = require('multer');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const { uploadAssignment,submitAssignment, getMySubmission, gradeSubmission, getAllSubmissions, getSubmissionsByCourseAndAssignment ,getAssignmentsByCourse} = require('../controllers/assignmentController');

const assignmentRouter = express.Router();
// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types
        cb(null, true);
    }
});

// Authenticate all routes
assignmentRouter.use(authenticateUser);

// Routes
assignmentRouter.post(
    '/uploadAssignment',
    authorizeRoles(['Student']),
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    },
    uploadAssignment
);

assignmentRouter.post('/:courseId/:assignmentId', authorizeRoles(['Student']), submitAssignment);
assignmentRouter.get('/:assignmentId/my', authorizeRoles(['Student']), getMySubmission);
assignmentRouter.get('/:courseId/assignments', authorizeRoles(['Instructor']), getAssignmentsByCourse);
assignmentRouter.get('/course/:courseId/assignment/:assignmentId/submissions', authorizeRoles(['Instructor']), getSubmissionsByCourseAndAssignment);
assignmentRouter.patch('/:submissionId/grade', authorizeRoles(['Instructor']), gradeSubmission);

module.exports = assignmentRouter;