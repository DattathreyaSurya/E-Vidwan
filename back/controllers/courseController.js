const Course = require('../models/courseModel');
const User = require('../models/userModel');
const notificationModel = require('../models/notificationModel');
const StudentCourseAnalytics = require('../models/analyticsModel');
const InstructorAnalytics = require('../models/instructorAnalyticsModel');
const ForumPost = require('../models/forumModel');
const AssignmentSubmission = require('../models/assignmentSubmissionModel');
const QuizAttempt = require('../models/quizAttemptModel');
const { createError } = require('../utils/error');
const path = require('path');
const fs = require('fs');
const Notification = require('../models/notificationModel');
 
// Create upload directories if they don't exist
const createUploadDirs = () => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const thumbnailDir = path.join(uploadDir, 'thumbnails');
    const contentDir = path.join(uploadDir, 'lecture_content');
 
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir);
    if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir);
};
 
createUploadDirs();
 
// Upload course thumbnail
exports.uploadThumbnail = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(createError(400, 'No file uploaded'));
        }
 
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join(__dirname, '..', 'uploads', 'thumbnails', fileName);
 
        // Write file to disk
        fs.writeFileSync(filePath, req.file.buffer);
 
        // Return the full URL that can be used to access the file
        const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/thumbnails/${fileName}`;
        res.status(200).json({
            success: true,
            fileUrl
        });
    } catch (error) {
        next(error);
    }
};
 
// Upload lecture content (now specifically for videos)
exports.uploadContent = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(createError(400, 'No file uploaded'));
        }
 
        // Validate that it's a video file
        if (!req.file.mimetype.startsWith('video/')) {
            return next(createError(400, 'Only video files are allowed'));
        }
 
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join(__dirname, '..', 'uploads', 'lecture_content', fileName);
 
        // Write file to disk
        fs.writeFileSync(filePath, req.file.buffer);
 
        // Return the full URL that can be used to access the file
        const videoUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/lecture_content/${fileName}`;
        res.status(200).json({
            success: true,
            fileUrl: videoUrl
        });
    } catch (error) {
        next(error);
    }
};
 
// Create a new course
exports.createCourse = async (req, res, next) => {
    try {
        const { title, description, category, thumbnail, content } = req.body;
 
        // First, validate and process the content items
        const processedContent = content.map(item => {
            // Basic validation
            if (!item.type || !item.title || !item.description) {
                throw createError(400, 'Each content item must have type, title, and description');
            }
 
            // Create base content item
            const processedItem = {
                type: item.type,
                title: item.title.trim(),
                description: item.description.trim()
            };
 
            // Handle type-specific fields
            switch (item.type) {
                case 'Video':
                    if (!item.videoUrl) {
                        throw createError(400, 'Video content must have a video URL. Please upload the video first.');
                    }
                    processedItem.videoUrl = item.videoUrl;
                    break;
 
                case 'Youtube Url':
                case 'Resource':
                    if (!item.url) {
                        throw createError(400, `${item.type} content must have a URL`);
                    }
                    processedItem.url = item.url;
                    break;
 
                case 'Quiz':
                    if (!item.quizData?.questions?.length) {
                        throw createError(400, 'Quiz must have at least one question');
                    }
                   
                    // Validate quiz questions
                    processedItem.quizData = {
                        questions: item.quizData.questions.map((q, idx) => {
                            if (!q.question || !q.options?.length || q.options.length !== 4) {
                                throw createError(400, `Question ${idx + 1} must have a question and exactly 4 options`);
                            }
                            if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
                                throw createError(400, `Question ${idx + 1} must have a valid correct answer that matches one of the options`);
                            }
                            if (typeof q.points !== 'number' || q.points <= 0) {
                                throw createError(400, `Question ${idx + 1} must have valid points (greater than 0)`);
                            }
                            return {
                                question: q.question.trim(),
                                options: q.options.map(opt => opt.trim()),
                                correctAnswer: q.correctAnswer.trim(),
                                points: q.points
                            };
                        }),
                        passingScore: item.quizData.passingScore || 70
                    };
                    break;
 
                    case 'Assignment':
                        // Assignment can have completionDays
                        if (item.completionDays) {
                            if (typeof item.completionDays !== 'number' || item.completionDays <= 0) {
                                throw createError(400, 'Assignment must have a positive number of days for completion');
                            }
                            processedItem.completionDays = item.completionDays;
                        }
                        break;
 
                default:
                    throw createError(400, `Invalid content type: ${item.type}`);
            }
 
            return processedItem;
        });
 
        // Create the course with processed content
        const course = await Course.create({
            title,
            description,
            category,
            thumbnail,
            content: processedContent,
            instructor: req.user._id
        });
 
        // Add course to instructor's created courses
        await User.findByIdAndUpdate(req.user._id, {
            $push: { createdCourses: course._id }
        });
       
        // Create a notification for the instructor
        const courseCreationInstructorNotification = new notificationModel({
            userId: req.user._id,
            message: `You have successfully created a new course: ${course.title}`,
            type: 'Course Created'
        });
        await courseCreationInstructorNotification.save();
 
        // Create a notification for all students
        const allStudents = await User.find({ role: 'Student' }, '_id');
        if (allStudents.length > 0) {
            const studentNotifications = allStudents.map(student => ({
                userId: student._id,
                message: `A new course "${course.title}" has been created. Check it out!`,
                type: 'New Course'
            }));
            await Notification.insertMany(studentNotifications);
        }      
 
 
        let analytics = await InstructorAnalytics.findOne({ instructor: req.user._id });
        if (analytics) {
            // Add the new course to the instructor's analytics if not already present
            if (!analytics.courses.some(c => c.course.toString() === course._id.toString())) {
                analytics.courses.push({ course: course._id, students: [] });
                await analytics.save();
            }
        } else {
            // Create a new analytics entry for the instructor
            await InstructorAnalytics.create({
                instructor: req.user._id,
                courses: [{ course: course._id, students: [] }]
            });
        }
 
        res.status(201).json({
            success: true,
            data: course,
            courseId: course._id
        });
    } catch (error) {
        next(error);
    }
};
 
// Get all courses (with filters and pagination)
exports.getAllCourses = async (req, res, next) => {
    try {
        // Fetch all courses without filters or pagination
        const courses = await Course.find()
            .populate('instructor', 'username email')
            .sort({ createdAt: -1 });
 
        res.status(200).json({
            success: true,
            data: courses
        });
    } catch (error) {
        next(error);
    }
};
 
// Get course by ID
exports.getCourseById = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'username email')
            .populate('enrolledStudents', 'username email');
 
        if (!course) {
            return next(createError(404, 'Course not found'));
        }
       
        res.status(200).json({
            success: true,
            data: course
        });
    } catch (error) {
        next(error);
    }
};
 
// Update course
exports.updateCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
 
        if (!course) {
            return next(createError(404, 'Course not found'));
        }
 
        if (course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You are not authorized to update this course'));
        }
 
        const updateData = { ...req.body };
 
        // If content is being updated, process it
        let newMaterial = false;
        if (updateData.content) {
            updateData.content = updateData.content.map(item => {
                const processedItem = {
                    type: item.type,
                    title: item.title.trim(),
                    description: item.description.trim()
                };
                if (item._id) {
                    processedItem._id = item._id;
                }
 
                switch (item.type) {
                    case 'Video':
                        if (!item.videoUrl) {
                            throw createError(400, 'Video content must have a video URL. Please upload the video first.');
                        }
                        processedItem.videoUrl = item.videoUrl;
                        break;
 
                    case 'Youtube Url':
                    case 'Resource':
                        if (!item.url) {
                            throw createError(400, `${item.type} content must have a URL`);
                        }
                        processedItem.url = item.url;
                        break;
 
                    case 'Quiz':
                        if (!item.quizData?.questions?.length) {
                            throw createError(400, 'Quiz must have at least one question');
                        }
                        processedItem.quizData = {
                            questions: item.quizData.questions.map((q, idx) => ({
                                question: q.question.trim(),
                                options: q.options.map(opt => opt.trim()),
                                correctAnswer: q.correctAnswer.trim(),
                                points: q.points
                            })),
                            passingScore: item.quizData.passingScore || 70
                        };
                        break;
 
                    case 'Assignment':
                        // Assignment can have dueDate
                        if (item.completionDays) {
                            if (typeof item.completionDays !== 'number' || item.completionDays <= 0) {
                                throw createError(400, 'Assignment must have a positive number of days for completion');
                            }
                            processedItem.completionDays = item.completionDays;
                        }
                        break;
 
                    default:
                        throw createError(400, `Invalid content type: ${item.type}`);
                }
 
                return processedItem;
            });
            newMaterial = true;
        }
 
        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('instructor', 'username email');
 
 
        // Notify enrolled students if new material was added
        if (newMaterial) {
            const students = course.enrolledStudents;
            const notifications = students.map(studentId => ({
                userId: studentId,
                message: `New material added to course: ${course.title}`,
                type: 'New Material'
            }));
            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        }
 
 
        // Create a notification for the instructor
        const instructorNotification = new notificationModel({
            userId: req.user._id,
            message: `You have successfully updated the course: ${updatedCourse.title}`,
            type: 'Course Updated'
        });
        await instructorNotification.save();
 
 
        res.status(200).json({
            success: true,
            data: updatedCourse
        });
    } catch (error) {
        next(error);
    }
};
 
// Delete course
exports.deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
 
        if (!course) {
            return next(createError(404, 'Course not found'));
        }
 
        if (course.instructor.toString() !== req.user._id.toString()) {
            return next(createError(403, 'You are not authorized to delete this course'));
        }
 
        await ForumPost.deleteMany({ courseId: course._id });
 
       
        await AssignmentSubmission.deleteMany({ course: course._id });
 
       
        await QuizAttempt.deleteMany({ course: course._id });
 
       
        await StudentCourseAnalytics.updateMany(
            {},
            { $pull: { enrolledCourses: { courseId: course._id } } }
        );
 
       
        await InstructorAnalytics.updateMany(
            {},
            { $pull: { courses: { course: course._id } } }
        );
 
       
        await notificationModel.deleteMany({ message: { $regex: course.title, $options: 'i' } });
 
       
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { createdCourses: course._id }
        });
 
       
        await User.updateMany(
            { 'enrolledCourses.course': course._id },
            { $pull: { enrolledCourses: { course: course._id } } }
        );
 
       
        await Course.deleteOne({ _id: req.params.id });
 
       
        const deleteCourseInstructorNotification = new notificationModel({
            userId: req.user._id,
            message: `You have successfully deleted the course: ${course.title}`,
            type: 'Course Deleted'
        });
        await deleteCourseInstructorNotification.save();
 
        const deleteCourseStudentNotifications = course.enrolledStudents.map(studentId => ({
            userId: studentId,
            message: `The course "${course.title}" has been deleted by the instructor.`,
            type: 'Course Deletion'
        }));
        if (deleteCourseStudentNotifications.length > 0) {
            await notificationModel.insertMany(deleteCourseStudentNotifications);
        }
 
        res.status(200).json({
            success: true,
            message: 'Course and all related data deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
 
exports.enrollInCourse = async (req, res, next) => {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
        return next(createError(404, 'Course not found'));
    }
    if (course.enrolledStudents.includes(req.user._id)) {
        return next(createError(400, 'You are already enrolled in this course'));
    }
    try {
        course.enrolledStudents.push(req.user._id);
        await course.save();
        // Add course to student's enrolled courses
        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                enrolledCourses: {
                    course: course._id,
                    enrolledAt: new Date()
                }
            }
        });
        const analytics = await StudentCourseAnalytics.findOne({ userId: req.user._id });
        if (analytics) {
            // Add the course to the enrolledCourses array if it doesn't already exist
            const existingCourse = analytics.enrolledCourses.find(c => c.courseId.toString() === course._id.toString());
            if (!existingCourse) {
              analytics.enrolledCourses.push({
                courseId: course._id,
                quizzes: [], // Initialize quizzes as an empty array
                assignments: [], // Initialize assignments as an empty array
                completionData: { progress: 0, completedAt: null } // Initialize course completion data
              });
              await analytics.save();
            }
          } else {
            // Create a new analytics entry if none exists
            await StudentCourseAnalytics.create({
              userId: req.user._id,
              enrolledCourses: [{
                courseId: course._id,
                quizzes: [],
                assignments: [],
                completionData: { progress: 0, completedAt: null }
              }]
            });
          }
        let instructorAnalytics = await InstructorAnalytics.findOne({ instructor: course.instructor });
        if (instructorAnalytics) {
            // Find the course entry
            let courseEntry = instructorAnalytics.courses.find(c => c.course.toString() === course._id.toString());
            if (courseEntry) {
                // Add student if not already present
                if (!courseEntry.students.some(s => s.student.toString() === req.user._id.toString())) {
                    courseEntry.students.push({ student: req.user._id, assignments: [], quizzes: [] });
                    await instructorAnalytics.save();
                }
            } else {
                // Add course with this student
                instructorAnalytics.courses.push({
                    course: course._id,
                    students: [{ student: req.user._id, assignments: [], quizzes: [] }]
                });
                await instructorAnalytics.save();
            }
        } else {
            // Create analytics for instructor if not present
            await InstructorAnalytics.create({
                instructor: course.instructor,
                courses: [{
                    course: course._id,
                    students: [{ student: req.user._id, assignments: [], quizzes: [] }]
                }]
            });
        }
 
       
    }
        catch (error) {
        return next(createError(500, 'Failed to enroll in course'));
    }
}
 
exports.getEnrolledCourses = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'enrolledCourses.course',
                select: 'title description category thumbnail content status createdAt instructor',
                populate: [
                    {
                    path: 'enrolledStudents',
                    select: 'username email'
                },
                {
                    path: 'instructor',
                    select: 'username email'
                }
            ]
            });
       
        // Transform the data to include enrollment dates
        const enrolledCourses = user.enrolledCourses.map(enrollment => ({
            ...enrollment.course.toObject()
        }));
 
 
        res.status(200).json({
            success: true,
            data: enrolledCourses
        });
    } catch (error) {
        next(error);
    }
};
 
// Get instructor courses
exports.getInstructorCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ instructor: req.user._id })
            .select('title description category thumbnail content status createdAt')
            .populate('enrolledStudents', 'username email')
            .sort({ createdAt: -1 });
 
        res.status(200).json({
            success: true,
            data: courses
        });
    } catch (error) {
        next(error);
    }
};
 
 