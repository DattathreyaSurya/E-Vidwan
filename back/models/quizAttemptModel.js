// models/quizAttemptModel.js
const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Embedded quiz _id from Course.content
  quizTitle: { type: String, required: true }, // Title of the quiz
  answers: [{
    questionIndex: { type: Number, required: true },
    selectedAnswer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  attemptedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for quick per-student lookup
quizAttemptSchema.index({ student: 1, quizId: 1 }, { unique: true });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
