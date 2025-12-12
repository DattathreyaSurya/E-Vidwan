const Course = require('../models/courseModel');
const Assignment = require('../models/assignmentSubmissionModel')
const Notification = require('../models/notificationModel'); 

// Get instructor dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const instructorId = req.user._id;

        // Get active courses count
        const activeCourses = await Course.countDocuments({
            instructor: instructorId
        });
        

        // Get total enrolled students across all courses
        const courses = await Course.find({ instructor: instructorId });
        const enrolledStudents = courses.reduce((total, course) => total + course.enrolledStudents.length, 0);

        // Get pending assessments (assignments)
        const pendingAssignments = await Assignment.countDocuments({
            course: { $in: courses.map(course => course._id) },
            feedback: { $exists: false },
            grade: { $exists: false },
            gradedAt: { $exists: false }
        });

        
        const unreadMessages = await Notification.countDocuments({
            userId: instructorId,
            isRead: false
        });
        res.json({
            success: true,
            data: {
                activeCourses,
                enrolledStudents,
                pendingAssignments,
                unreadMessages 
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};

// Get recent activities
const getRecentActivities = async (req, res) => {
    try {
        const instructorId = req.user._id;
        const courses = await Course.find({ instructor: instructorId });
        const courseIds = courses.map(course => course._id);

        // Get recent submissions
        const recentSubmissions = await Assignment.find({
            course: { $in: courseIds },
            submittedAt: { $exists: true }
        })
        .sort({ submittedAt: -1 })
        .limit(5)
        .populate('student', 'username')
        .populate('course', 'title');

        // Get recent enrollments
        const recentEnrollments = await Course.find({
            _id: { $in: courseIds },
            'enrolledStudents.enrolledAt': { $exists: true }
        })
        .sort({ 'enrolledStudents.enrolledAt': -1 })
        .limit(5);
        // Get recent notifications - commented out as notifications not yet implemented
        const recentNotifications = await Notification.find({
            userId: instructorId
        })
        .sort({ createdAt: -1 })
        .limit(5);

        // Combine and format activities
        const activities = [
            ...recentSubmissions.map(sub => ({
                type: 'submission',
                message: `New submission from a student in ${sub.course.title}`,
                time: sub.submittedAt
            })),
            ...recentEnrollments.flatMap(course => 
                course.enrolledStudents.map(enrollment => ({
                    type: 'enrollment',
                    message: `A student enrolled in ${course.title}`,
                    time: enrollment.enrolledAt
                }))
            ),
            ...recentNotifications.map(note => ({
                type: 'notification',
                message: note.message,
                time: note.createdAt
            })),
        ].sort((a, b) => b.time - a.time)
        .slice(0, 10);

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching recent activities',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getRecentActivities
}; 