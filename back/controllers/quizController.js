const QuizAttempt = require('../models/quizAttemptModel');
const Course = require('../models/courseModel');
const studentCourseAnalytics = require('../models/analyticsModel');
const InstructorAnalytics = require('../models/instructorAnalyticsModel');
const { createError } = require('../utils/error');
 
// Submit quiz attempt
// Allow multiple attempts — saves every attempt
exports.attemptQuiz = async (req, res, next) => {
  try {
    const { courseId, quizId } = req.params;
    const { answers } = req.body;
 
    const course = await Course.findById(courseId);
    const quizContent = course?.content.find(c => c._id.toString() === quizId && c.type === 'Quiz');
    if (!quizContent) return next(createError(404, 'Quiz not found'));
 
    const questions = quizContent.quizData.questions;
    let score = 0;
    let maxScore = 0;
    let quizTitle = quizContent.title;
 
 
 
    const evaluatedAnswers = answers.map(a => {
      const q = questions[a.questionIndex];
      const isCorrect = q.correctAnswer === a.selectedAnswer;
      score += isCorrect ? q.points : 0;
      maxScore += q.points;
      return { questionIndex: a.questionIndex, selectedAnswer: a.selectedAnswer, isCorrect };
    });
    const minMarks = course.content.quizData?.passingScore || 0;
    const minPercentage = minMarks / 100;
 
    const attempt = await QuizAttempt.create({
      student: req.user._id,
      course: course._id,
      quizId,
      quizTitle,
      answers: evaluatedAnswers,
      score,
      maxScore
    });
 
    const analytics = await studentCourseAnalytics.findOne({ userId: req.user._id });
 
    if (analytics) {
      const enrolledCourse = analytics.enrolledCourses.find(c => c.courseId.toString() === courseId);
 
      if (enrolledCourse) {
        // Check if quiz attempt already exists
        const quizIndex = enrolledCourse.quizzes.findIndex(q => q.quizId.toString() === quizId);
        if (quizIndex > -1) {
          // Replace the existing attempt
          enrolledCourse.quizzes[quizIndex] = {
            quizId,
            quizTitle,
            score,
            maxScore,
            passed: score >= maxScore * minPercentage,
            attemptedAt: new Date()
          };
        } else {
          // Add new attempt
          enrolledCourse.quizzes.push({
            quizId,
            quizTitle,
            score,
            maxScore,
            passed: score >= maxScore *  minPercentage,
            attemptedAt: new Date()
          });
        }
      }
      else {
        // If the course doesn't exist in enrolledCourses, add it
        analytics.enrolledCourses.push({
          courseId,
          quizzes: [{
            quizId,
            quizTitle,
            score,
            maxScore,
            passed: score >= maxScore * minPercentage,
            attemptedAt: new Date()
          }],
          assignments: [],
          completionData: { progress: 0, completedAt: null }
        });
      }
 
      await analytics.save();
    } else {
      // Create a new analytics entry if none exists
      await analytics.create({
        userId: req.user._id,
        enrolledCourses: [{
          courseId,
          quizzes: [{
            quizId,
            quizTitle,
            score,
            maxScore,
            passed: score >= maxScore * 0.7,
            attemptedAt: new Date()
          }],
          assignments: [],
          completionData: { progress: 0, completedAt: null }
        }]
      });
    }
 
    // Update instructor analytics
    let instructorAnalytics = await InstructorAnalytics.findOne({ instructor: course.instructor });
    if (instructorAnalytics) {
      // Find the course entry
      let courseEntry = instructorAnalytics.courses.find(c => c.course.toString() === course._id.toString());
      if (!courseEntry) {
        // If course entry doesn't exist, add it
        courseEntry = {
          course: course._id,
          students: []
        };
        instructorAnalytics.courses.push(courseEntry);
      }
      // Find the student entry
      let studentEntry = courseEntry.students.find(s => s.student.toString() === req.user._id.toString());
      if (!studentEntry) {
        // If student entry doesn't exist, add it
        studentEntry = {
          student: req.user._id,
          assignments: [],
          quizzes: []
        };
        courseEntry.students.push(studentEntry);
      }
      // Find the quiz entry
      let quizEntry = studentEntry.quizzes.find(q => q.quizId.toString() === quizId);
      if (quizEntry) {
        // Update score and maxScore
        quizEntry.score = score;
        quizEntry.maxScore = maxScore;
        quizEntry.quizTitle = quizTitle;
      } else {
        // Add new quiz entry
        studentEntry.quizzes.push({
          quizId,
          quizTitle,
          score,
          maxScore
        });
      }
      await instructorAnalytics.save();
    } else {
      // If instructor analytics doesn't exist, create it
      await InstructorAnalytics.create({
        instructor: course.instructor,
        courses: [{
          course: course._id,
          students: [{
            student: req.user._id,
            assignments: [],
            quizzes: [{
              quizId,
              quizTitle,
              score,
              maxScore
            }]
          }]
        }]
      });
    }
 
 
    res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};
 
 
// View student's own attempt
exports.getMyAttempt = async (req, res, next) => {
  try {
    const { quizId } = req.params;
 
    const attempt = await QuizAttempt.findOne({
      student: req.user._id,
      quizId
    });
 
    if (!attempt) return next(createError(404, 'Attempt not found'));
 
    res.status(200).json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};
 
 
exports.clearQuizAttempt = async (req, res, next) => {
  try {
    const { quizId } = req.params;
 
    const attempt = await QuizAttempt.findOneAndDelete({
      student: req.user._id,
      quizId
    });
 
    if (!attempt) return next(createError(404, 'No previous attempt found'));
 
    res.status(200).json({ success: true, message: 'Previous attempt cleared' });
  } catch (error) {
    next(error);
  }
};
 