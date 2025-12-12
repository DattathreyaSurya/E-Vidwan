const mongoose = require("mongoose");
 
const quizSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  quizTitle: { type: String, required: true }, // Title of the quiz
  score: { type: Number, default: 0 }, // Score for the quiz
  maxScore: { type: Number, default: 0 }, // Maximum score for the quiz
  passed: { type: Boolean, default: false }, // Whether the student passed the quiz
  attemptedAt: { type: Date }, // Date of attempt
});
 
const assignmentSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
  assignmentTitle: {type: String, required: true},
  grade: { type: Number}, // Score for the assignment
});
 
const courseCompletionSchema = new mongoose.Schema({
  progress: { type: Number, default: 0 }, // Percentage of course completion
  completedAt: { type: Date }, // Date of course completion
});
 
const enrolledCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  quizzes: [quizSchema], // List of quizzes for the course
  assignments: [assignmentSchema], // List of assignments for the course
  completionData: courseCompletionSchema, // Course completion data
});
 
const studentCourseAnalyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  enrolledCourses: [enrolledCourseSchema], // List of enrolled courses with nested data
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});
 
module.exports = mongoose.model("StudentCourseAnalytics", studentCourseAnalyticsSchema);