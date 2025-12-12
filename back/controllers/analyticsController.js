const Analytics = require("../models/analyticsModel");
const instructorAnalytics = require("../models/instructorAnalyticsModel");
const { createError } = require("../utils/error");

// Controller to fetch analytics data for a specific student
exports.getAnalyticsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
 
    const analytics = await Analytics.findOne({ userId: studentId }).populate({
      path: "enrolledCourses.courseId",
      select: "title description category",
    });
 
    if (!analytics) {
      return next(createError(404, "Analytics data not found for the student"));
    }
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

exports.updateCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { progress } = req.body;
    const userId = req.user._id;

    const analytics = await Analytics.findOne({ userId });
    if (!analytics) 
    {
      return res.status(404).json({ message: "Analytics not found" });
    }

    const enrolledCourse = analytics.enrolledCourses.find(c => c.courseId.toString() === courseId);
    if (!enrolledCourse) 
    {
      return res.status(404).json({ message: "Enrolled course not found" });
    }

    enrolledCourse.completionData.progress = progress;
    if (progress === 100) {
      enrolledCourse.completionData.completedAt = new Date();
    }

    await analytics.save();

    const instructorAnalyticsDoc = await instructorAnalytics.findOne({ "courses.course": courseId });
    if (instructorAnalyticsDoc) {
      // Find the course analytics entry
      const courseEntry = instructorAnalyticsDoc.courses.find(c => c.course.toString() === courseId);
      if (courseEntry) {
        // Find the student entry
        const studentEntry = courseEntry.students.find(s => s.student.toString() === userId.toString());
        if (studentEntry) {
          studentEntry.courseProgress = progress;
          await instructorAnalyticsDoc.save();
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};