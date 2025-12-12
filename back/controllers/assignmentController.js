const AssignmentSubmission = require('../models/assignmentSubmissionModel');
const Course = require('../models/courseModel');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const studentCourseAnalytics = require('../models/analyticsModel');
const InstructorAnalytics = require('../models/instructorAnalyticsModel');
const transporter = require('../utils/mailer'); // Ensure you have a mailer utility set up
const { createError } = require('../utils/error');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

//Schedule a cron job to tell user about due date of assignments
cron.schedule('0 11 * * *', async () => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get all courses with assignments
    const courses = await Course.find({ "content.type": "Assignment" });

    for (const course of courses) {
      // For each assignment section in course content
      for (const section of course.content) {
        if (section.type !== "Assignment" || !section.completionDays) continue;

        // For each enrolled student
        for (const studentObj of course.enrolledStudents) {
          const studentId = studentObj._id; 
          const enrolledAt = studentObj.enrolledAt;
          const dueDate = new Date(new Date(enrolledAt).getTime() + section.completionDays * 24 * 60 * 60 * 1000);

          // If due in next 3 days and not submitted
          if (dueDate > now && dueDate <= threeDaysLater) {
            const submission = await AssignmentSubmission.findOne({
              student: studentId,
              assignmentId: section._id
            });
            if (!submission) {
              // Send notification or email
              const student = await User.findById(studentId);
              if (student && student.email) {
                await transporter.sendMail({
                  from: process.env.EMAIL,
                  to: student.email,
                  subject: 'Assignment Due Reminder',
                  text: `Reminder: Assignment "${section.title}" for course "${course.title}" is due on ${dueDate.toLocaleDateString()}.`
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in assignment due reminder cron job:', error);
  }
});


// Create upload directory for assignments
const createAssignmentUploadDir = () => {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  const assignmentsDir = path.join(uploadDir, 'assignments');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir); // Ensure uploads folder exists
  if (!fs.existsSync(assignmentsDir)) fs.mkdirSync(assignmentsDir); // Create assignments folder
};
createAssignmentUploadDir();


// Upload assignment file
exports.uploadAssignment = async (req, res, next) => {
    try {
        if (!req.file) {
            logger.error('No file uploaded');
            return next(createError(400, 'No file uploaded'));
        }
 
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join(__dirname, '..', 'uploads', 'assignments', fileName);
 
        // Write file to disk
        fs.writeFileSync(filePath, req.file.buffer);
 
        // Return the full URL that can be used to access the file
        const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/assignments/${fileName}`;

        res.status(200).json({
            success: true,
            fileUrl
        });
    } catch (error) {
        next(error);
    }
};

//Submit assignment
exports.submitAssignment = async (req, res, next) => {
  try {
    const { courseId, assignmentId } = req.params;

    // Check if course exists and user is enrolled
    const course = await Course.findById(courseId).populate('enrolledStudents');
    console.log(course);
    if (!course)
    {
      return next(createError(404, 'Course not found'));
    }

    if (!course.enrolledStudents.some(student => student._id.toString() === req.user._id.toString())) 
      {
        return next(createError(403, 'You are not enrolled in this course'))
    }

    // Create or update submission
    let submission = await AssignmentSubmission.findOneAndUpdate(
      { student: req.user._id, assignmentId },
      {
        student: req.user._id,
        course: courseId,
        assignmentId,
        fileUrl: req.body.fileUrl || null,
        submittedAt: new Date()
      },
      { new: true, upsert: true }
    );

    if (!submission) 
    {
      return next(createError(500, 'Failed to submit assignment'));
    }

    // Create a notification for the instructor
    const assignmentSubmissionInstructorNotification = new Notification({
      userId: course.instructor,
      message: `New assignment submission from ${req.user.username} for ${course.title}`,
      type: 'New Submission',
      isRead: false
    });
    await assignmentSubmissionInstructorNotification.save();

    // Create a notification for the student  
    const assignmentSubmissionStudentNotification = new Notification({
      userId: req.user._id,
      message: `Your assignment for ${course.title} has been submitted successfully.`,
      type: 'Assignment Submitted',
      isRead: false
    });
    await assignmentSubmissionStudentNotification.save();

    let assignmentTitle = "Assignment";
    if (course && Array.isArray(course.content)) {
      const assignmentObj = course.content.find(item => item._id.toString() === assignmentId);
      if (assignmentObj && assignmentObj.title) {
        assignmentTitle = assignmentObj.title;
      }
    }

    // Update analytics
    let analytics = await studentCourseAnalytics.findOne({ userId: req.user._id });
    
    if (analytics) {
      // Check if course already exists in analytics
      const courseIndex = analytics.enrolledCourses.findIndex(course => course.courseId.toString() === courseId);
      if (courseIndex > -1) {
        // Add new assignment submission
          analytics.enrolledCourses[courseIndex].assignments.push({
            assignmentId,
            assignmentTitle,
          });
      } else {
        // Add new course with assignment submission
        analytics.enrolledCourses.push({
          courseId,
          assignments: [{
            assignmentId,
            assignmentTitle
          }],
          quizzes: [],
          completionData: { progress: 0, completedAt: null }
        });
      }
      await analytics.save();
    } else {
      // Create new analytics entry
      await studentCourseAnalytics.create({
        userId: req.user._id,
        enrolledCourses: [{
          courseId,
          assignments: [{
            assignmentId,
            assignmentTitle
          }],
          quizzes: [],
          completionData: { progress: 0, completedAt: null }
        }]
      });
    }
    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};


// View student's own submission
exports.getMySubmission = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const submission = await AssignmentSubmission.findOne({
      student: req.user._id,
      assignmentId
    });

    if (!submission) {

      return res.status(200).json({
        success: true,
        data: null,
        message: 'No submission found for this assignment'
      });
    }

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

// Grade a student's assignment submission
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    const submission = await AssignmentSubmission.findById(submissionId).populate('course');
    if (!submission) 
    {
      return next(createError(404, 'Submission not found'));
    }

    if (submission.course.instructor.toString() !== req.user._id.toString()) {
      {
        return next(createError(403, 'You are not authorized to grade this submission'));
      }
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedAt = new Date();

    await submission.save();

    let assignmentTitle = "Assignment";
    if (submission.course && submission.course.content && Array.isArray(submission.course.content)) {
      const assignmentObj = submission.course.content.find(item => item._id.toString() === submission.assignmentId.toString());
      if (assignmentObj && assignmentObj.title) {
        assignmentTitle = assignmentObj.title;
      }
    }

    const courseTitle = submission.course.title || 'Course';

    const gradedStudentNotification = new Notification({
      userId: submission.student,
      message: `Your assignment "${assignmentTitle}" in ${courseTitle} has been graded.`,
      type: 'Assignment Graded',
      isRead: false
    }); 
    await gradedStudentNotification.save();

    const analytics = await studentCourseAnalytics.findOne({ userId: submission.student });
    if (analytics) {
      // Find the course in analytics
      const courseIndex = analytics.enrolledCourses.findIndex(course => course.courseId.toString() === submission.course._id.toString());
      if (courseIndex > -1) {
        // Update the assignment grade
        const assignmentIndex = analytics.enrolledCourses[courseIndex].assignments.findIndex(assignment => assignment.assignmentId.toString() === submission.assignmentId.toString());
        if (assignmentIndex > -1) {
          analytics.enrolledCourses[courseIndex].assignments[assignmentIndex].grade = grade;
        }
      }
      await analytics.save();
    }
    else {
      // Create a new analytics entry if none exists
      await studentCourseAnalytics.create({
        userId: submission.student,
        enrolledCourses: [{
          courseId: submission.course._id,
          assignments: [{
            assignmentId: submission.assignmentId,
            grade
          }],
          quizzes: [],
          completionData: { progress: 0, completedAt: null }
        }]
      });
    }

    let instructorAnalytics = await InstructorAnalytics.findOne({ instructor: submission.course.instructor });
    if (instructorAnalytics) {
      // Find the course entry
      let courseEntry = instructorAnalytics.courses.find(c => c.course.toString() === submission.course._id.toString());
      if (!courseEntry) {
        // If course entry doesn't exist, add it
        courseEntry = {
          course: submission.course._id,
          students: []
        };
        instructorAnalytics.courses.push(courseEntry);
      }
      // Find the student entry
      let studentEntry = courseEntry.students.find(s => s.student.toString() === submission.student.toString());
      if (!studentEntry) {
        // If student entry doesn't exist, add it
        studentEntry = {
          student: submission.student,
          assignments: [],
          quizzes: []
        };
        courseEntry.students.push(studentEntry);
      }
      // Find the assignment entry
      let assignmentEntry = studentEntry.assignments.find(a => a.assignmentId.toString() === submission.assignmentId.toString());
      if (assignmentEntry) {
        // Update grade and submittedAt
        assignmentEntry.assignmentTitle = assignmentTitle;
        assignmentEntry.grade = grade;
        assignmentEntry.submittedAt = submission.submittedAt;
      } else {
        // Add new assignment entry
        studentEntry.assignments.push({
          assignmentId: submission.assignmentId,
          assignmentTitle: assignmentTitle,
          grade: grade,
          submittedAt: submission.submittedAt
        });
      }
      await instructorAnalytics.save();
    } else {
      // If instructor analytics doesn't exist, create it
      await InstructorAnalytics.create({
        instructor: submission.course.instructor,
        courses: [{
          course: submission.course._id,
          students: [{
            student: submission.student,
            assignments: [{
              assignmentId: submission.assignmentId,
              assignmentTitle: assignmentTitle,
              grade: grade,
              submittedAt: submission.submittedAt
            }],
            quizzes: []
          }]
        }]
      });
    }
    res.status(200).json({ success: true, message: 'Graded successfully', data: submission });
  } catch (error) {
    next(error);
  }
};

// Get all submissions for an assignment
exports.getAllSubmissions = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const submissions = await AssignmentSubmission.find({ assignmentId })
      .populate('student', 'username email')
      .sort({ submittedAt: -1 });
    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

// Get submissions by course and assignment
exports.getSubmissionsByCourseAndAssignment = async (req, res, next) => {
  try {
    const { courseId, assignmentId } = req.params;

    // Fetch submissions for the given course and assignment
    const submissions = await AssignmentSubmission.find({ course: courseId, assignmentId: assignmentId })
      .populate('student', 'username email')
      .populate('course', 'title');

    if (!submissions.length) {
      return res.status(404).json({ success: false, message: 'No submissions found for this course and assignment' });
    }
    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

// Get assignments by course
exports.getAssignmentsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Fetch the course and filter assignments from its content
    const course = await Course.findById(courseId).populate('instructor', 'username email');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Filter assignments from the course content
    const assignments = course.content.filter((item) => item.type === 'Assignment');

    if (!assignments.length) {
      return res.status(404).json({ success: false, message: 'No assignments found for this course' });
    }
     // Return the assignments
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};
