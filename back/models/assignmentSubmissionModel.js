// models/assignmentSubmissionModel.js
const mongoose = require("mongoose");

const assignmentSubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Embedded assignment _id from Course.content
  fileUrl: { type: String }, // Uploaded file link or text submission
  submittedAt: { type: Date, default: Date.now },
  grade: { type: Number },
  feedback: { type: String },
  gradedAt: { type: Date }
}, {
  timestamps: true
});

// Index for faster querying by student and assignment
assignmentSubmissionSchema.index({ student: 1, assignmentId: 1 }, { unique: true });

module.exports = mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
