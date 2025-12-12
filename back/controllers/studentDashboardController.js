const Course = require('../models/courseModel');
const Assignment = require('../models/assignmentSubmissionModel');
const Notification = require('../models/notificationModel');

// Get student dashboard statistics
const getStudentDashboardStats = async (req, res) => {
    try {
        const studentId = req.user._id;

        // Get enrolled courses count
        const enrolledCourses = await Course.countDocuments({
            'enrolledStudents._id': studentId
        });


        // Get unread notifications
        const unreadMessages = await Notification.countDocuments({
            userId: studentId,
            isRead: false
        });

        res.json({
            success: true,
            data: {
                enrolledCourses,
                unreadMessages
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching student dashboard statistics',
            error: error.message
        });
    }
};

// Get student recent activities
const getStudentRecentActivities = async (req, res) => {
    try {
        const studentId = req.user._id;

        // Get recent notifications
        const recentNotifications = await Notification.find({
            userId: studentId,
            isRead: false
        })
        .sort({ createdAt: -1 })
        .limit(5);

        // Combine and format activities
        const activities = [
            ...recentNotifications.map(notif => ({
                type: 'notification',
                message: notif.message,
                time: notif.createdAt
            }))
        ].sort((a, b) => b.time - a.time)
        .slice(0, 10);

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching student recent activities',
            error: error.message
        });
    }
};

const getUpcomingAssignments = async (req, res) => {
    try {
        const studentId = req.user._id;
        const now = new Date();

        // Find all courses where the student is enrolled
        const courses = await Course.find({ "enrolledStudents._id": studentId });

        let upcomingAssignments = [];

        for (const course of courses) {
            // Find the student's enrollment date in this course
            const studentObj = course.enrolledStudents.find(s => s._id.toString() === studentId.toString());
            if (!studentObj) continue;
            const enrolledAt = new Date(studentObj.enrolledAt);

            // For each assignment section in the course
            for (const section of course.content) {
                if (section.type !== "Assignment" || !section.completionDays) continue;

                // Calculate due date
                const dueDate = new Date(enrolledAt.getTime() + section.completionDays * 24 * 60 * 60 * 1000);

                // Check if assignment is due in the future and not yet submitted
                if (dueDate > now) {
                    const submission = await Assignment.findOne({
                        student: studentId,
                        assignmentId: section._id
                    });
                    if (!submission) {
                        upcomingAssignments.push({
                            courseId: course._id,
                            courseTitle: course.title,
                            assignmentId: section._id,
                            assignmentTitle: section.title,
                            dueDate
                        });
                    }
                }
            }
        }

        // Sort by due date ascending
        upcomingAssignments.sort((a, b) => a.dueDate - b.dueDate);

        res.json({
            success: true,
            data: upcomingAssignments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching upcoming assignments',
            error: error.message
        });
    }
};

module.exports = {
    getStudentDashboardStats,
    getStudentRecentActivities,
    getUpcomingAssignments
};