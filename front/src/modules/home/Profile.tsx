import React, { useEffect, useState } from "react";
import { getUserProfile, getUserProfileStats, getInstructorProfileStats } from "../../services/authService.ts";
import { FaTrophy } from "react-icons/fa";
import Navbar from "../home/Navbar.tsx";
import "./Profile.css";

interface Course {
  _id: string;
  title: string;
}

interface StudentProfileStats {
  totalCoursesCompleted: number;
  avgQuizScore: number;
  avgAssignmentGrade: number;
  totalAssignmentsSubmitted: number;
  totalQuizzesAttempted: number;
  badges: string[];
}

interface InstructorProfileStats {
  totalCoursesCreated: number;
  totalStudentsTaught: number;
  avgCourseCompletionRate: number;
  badges: string[];
}

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: string;
  enrolledCourses: Array<{
    course: Course;
    enrolledAt: string;
  }>;
  createdCourses: Course[];
  createdAt: string;
}

const studentBadgeDescriptions: Record<string, string> = {
  "First Course Completed": "Awarded for completing your first course.",
  "Course Explorer": "Completed 5 or more courses.",
  "Learning Marathon": "Completed 10 or more courses.",
  "Top Scorer": "Average quiz score is 90% or above.",
  "Quiz Pro": "Average quiz score is 75% or above.",
  "Assignment Enthusiast": "Submitted 10 or more assignments.",
  "Assignment Master": "Submitted 25 or more assignments.",
  "Quiz Challenger": "Attempted 20 or more quizzes.",
  "Quiz Veteran": "Attempted 50 or more quizzes.",
  "Assignment Ace": "Average assignment grade is 90% or above.",
  "Perfect Quizzer": "Scored 100% in all quiz attempts.",
};

const instructorBadgeDescriptions: Record<string, string> = {
  "First Course Published": "Published your first course.",
  "Course Creator": "Published 5 or more courses.",
  "Master Instructor": "Published 10 or more courses.",
  "Mentor": "Taught 50 or more students.",
  "Community Builder": "Taught 200 or more students.",
  "Engagement Star": "Average course completion rate is 80% or above.",
  "Popular Course": "A course with 100 or more students enrolled.",
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState<StudentProfileStats | null>(null);
  const [instructorStats, setInstructorStats] = useState<InstructorProfileStats | null>(null);

  useEffect(() => {
    getUserProfile()
      .then(data => setProfile(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.role === "Instructor") {
      getInstructorProfileStats().then(setInstructorStats);
    } else if (profile?.role === "Student") {
      getUserProfileStats().then(setStudentStats);
    }
  }, [profile?.role]);

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>User not found.</div>;

  const isInstructor = profile.role === "Instructor";

  // Helper to get badge description
  const getBadgeDescription = (badge: string) => {
    return isInstructor
      ? instructorBadgeDescriptions[badge] || "Instructor achievement"
      : studentBadgeDescriptions[badge] || "Student achievement";
  };

  return (
    <>
      <Navbar userRole={profile.role} />
      <div className="profile-page">
        <h2>{profile.username}'s Profile</h2>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
        <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
        <hr />
        {isInstructor ? (
          <>
            <h4>Created Courses</h4>
            <ul>
              {profile.createdCourses.length === 0 ? (
                <li>None</li>
              ) : (
                profile.createdCourses.map(c => (
                  <li key={c._id}>{c.title}</li>
                ))
              )}
            </ul>
            <hr />
            <div className="achievements-section">
              <h4>Instructor Stats & Badges</h4>
              {instructorStats ? (
                <div>
                  <p><strong>Total Courses Created:</strong> {instructorStats.totalCoursesCreated}</p>
                  <p><strong>Total Students Taught:</strong> {instructorStats.totalStudentsTaught}</p>
                  <p><strong>Avg. Course Completion Rate:</strong> {instructorStats.avgCourseCompletionRate}%</p>
                  <div className="badge-list">
                    <strong>Badges:</strong>
                    {instructorStats.badges.length === 0 ? (
                      <span> None yet</span>
                    ) : (
                      instructorStats.badges.map(badge => (
                        <span
                          className="badge-trophy badge-tooltip-parent"
                          key={badge}
                          tabIndex={0}
                        >
                          <FaTrophy className="trophy-icon" />
                          {badge}
                          <span className="badge-tooltip">
                            {getBadgeDescription(badge)}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <p>Loading stats...</p>
              )}
            </div>
          </>
        ) : (
          <>
            <h4>Enrolled Courses</h4>
            <ul>
              {profile.enrolledCourses.length === 0 ? (
                <li>None</li>
              ) : (
                profile.enrolledCourses.map(ec => (
                  <li key={ec.course._id}>{ec.course.title}</li>
                ))
              )}
            </ul>
            <hr />
            <div className="achievements-section">
              <h4>Achievements & Stats</h4>
              {studentStats ? (
                <div>
                  <p><strong>Total Courses Completed:</strong> {studentStats.totalCoursesCompleted}</p>
                  <p><strong>Average Quiz Score:</strong> {studentStats.avgQuizScore}</p>
                  <p><strong>Average Assignment Grade:</strong> {studentStats.avgAssignmentGrade}</p>
                  <p><strong>Total Assignments Submitted:</strong> {studentStats.totalAssignmentsSubmitted}</p>
                  <p><strong>Total Quizzes Attempted:</strong> {studentStats.totalQuizzesAttempted}</p>
                  <div className="badge-list">
                    <strong>Badges:</strong>
                    {studentStats.badges.length === 0 ? (
                      <span> None yet</span>
                    ) : (
                      studentStats.badges.map(badge => (
                        <span
                          className="badge-trophy badge-tooltip-parent"
                          key={badge}
                          tabIndex={0}
                        >
                          <FaTrophy className="trophy-icon" />
                          {badge}
                          <span className="badge-tooltip">
                            {getBadgeDescription(badge)}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <p>Loading stats...</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Profile;