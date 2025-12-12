const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  questions: [{
    question: String,
    options: [String],
    correctAnswer: String,
    points: Number
  }],
  passingScore: { type: Number, default: 70 }
});

const contentSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['Video', 'Youtube Url', 'Quiz', 'Assignment', 'Resource']
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  url: String,
  videoUrl: String,
  quizData: {
    type: quizSchema,
    required: function() {
      return this.type === 'Quiz';
    },
    validate: {
      validator: function(value) {
        if (this.type === 'Quiz') {
          return value && value.questions && value.questions.length > 0;
        }
        return true;
      },
      message: 'Quiz must have at least one question'
    }
  },
  completionDays: {
    type: Number,
    required: false,
    min: 1,
    validate: {
      validator: function(value) {
        return this.type !== 'Assignment' || (value && value > 0);
      },
      message: 'Assignment must have a positive number of days for completion'
    }
  }
});


contentSchema.pre('save', function(next) {
  if (this.type === 'Youtube Url' || this.type === 'Resource') {
    if (!this.url) {
      next(new Error(`${this.type} content must have a URL`));
      return;
    }
  }
  if (this.type === 'Video' && !this.videoUrl) {
    next(new Error('Video content must have a video URL'));
    return;
  }
  next();
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  thumbnail: { type: String, required: true },
  content: [contentSchema],
  enrolledStudents: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    enrolledAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course; 