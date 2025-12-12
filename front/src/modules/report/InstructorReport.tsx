import React, { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Navbar from "../home/Navbar.tsx";
import { getInstructorAnalytics } from "../../services/instructorAnalyticsService.ts";
 
// Interfaces for data structure
interface StudentAssignment {
  assignmentId: string;
  assignmentTitle: string;
  grade?: number; // grade can be optional, meaning it's pending
  submittedAt?: string;
}
 
interface StudentQuiz {
  quizId: string;
  quizTitle: string;
  score?: number; // score can be optional
  maxScore: number;
}
 
interface StudentPerformanceData {
  student: string; // userId
  assignments: StudentAssignment[];
  quizzes: StudentQuiz[];
}
 
interface CourseAnalyticsBackend {
  course: {
    _id: string;
    title: string;
    description: string; // description from populate
  };
  students: StudentPerformanceData[];
}
 
interface InstructorAnalyticsBackend {
  instructor: string; // userId
  courses: CourseAnalyticsBackend[];
}
 
// Frontend Interfaces for transformed data
interface Performance {
  name: string;
  students: number;
}
 
interface Assignment {
  assignment: string;
  completed: number;
  pending: number;
  averageScore: number;
}
 
interface Quiz {
  quiz: string;
  completed: number;
  pending: number;
  averageScore: number;
}
 
interface CourseCompletionRange {
  name: string;
  students: number;
}
 
interface Course {
  _id: string; // Changed from 'id' to '_id' to match MongoDB
  title: string;
  totalStudents: number;
  overallProgress: number; // Average progress of all students in this course
  category: string; // Assuming courses have a category field, if not remove this
  gradeDistribution: Performance[];
  assignmentCompletion: Assignment[];
  averageQuizScore: number; // Overall average quiz score for this particular course
  averageAssignmentScore: number; // Overall average assignment score for this particular course
  studentsCompletedCourse: number; // Number of students who completed this course
  courseCompletionDistribution: CourseCompletionRange[];
  quizCompletion: Quiz[];
}
 
// Colors for charts
const COLORS = ["#4CAF50", "#2196F3", "#FF9800", "#F44336", "#9C27B0", "#00BCD4", "#E91E63", "#673AB7"];

const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, " ");
const titleCase = (str: string) => str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
 
const coursesPerPage = 6;

const InstructorReport: React.FC = () => {
  const [instructorCourses, setInstructorCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'default'>('default');
  const [currentPage, setCurrentPage] = useState(1);
 
  useEffect(() => {
    const fetchInstructorAnalyticsData = async () => {
      try {
        setIsLoading(true);
        setError(null);
 
        const instructorId = sessionStorage.getItem("userId");
        if (!instructorId) {
          setError("Instructor ID not found in session storage. Please log in.");
          setIsLoading(false);
          return;
        }
 
        const data: InstructorAnalyticsBackend = await getInstructorAnalytics(instructorId);
 
        // --- Data Transformation Logic ---
        const transformedCourses: Course[] = data.data.courses.map(backendCourse => {

          const totalStudentsInCourse = backendCourse.students.length;
          let totalCourseProgressSum = 0;
          let totalOverallStudentScore = 0;
          let studentsWithScores = 0;
          let studentsCompletedCourseCount = 0;
 
          const gradeDistributionMap: { [key: string]: number } = {
            "A": 0, "B": 0, "C": 0, "D": 0, "F": 0
          };
          const courseCompletionDistributionMap: { [key: string]: number } = {
            "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0
          };
 
          const quizStats = new Map<string, { completed: number; pending: number; totalScore: number; count: number; }>();
          const assignmentStats = new Map<string, { completed: number; pending: number; totalScore: number; count: number; }>();
 
          // Populate master lists with all unique assignments/quizzes from all students in this course
          backendCourse.students.forEach(s => {
            s.quizzes.forEach(q => {
              const normTitle = normalizeTitle(q.quizTitle);
              if (!quizStats.has(normTitle)) {
                quizStats.set(normTitle, { completed: 0, pending: totalStudentsInCourse, totalScore: 0, count: 0 });
              }
            });
            s.assignments.forEach(a => {
              const normTitle = normalizeTitle(a.assignmentTitle);
              if (!assignmentStats.has(normTitle)) {
                assignmentStats.set(normTitle, { completed: 0, pending: totalStudentsInCourse, totalScore: 0, count: 0 });
              }
            });
          });
 
          backendCourse.students.forEach(student => {
            let studentTotalScore = 0;
            let studentGradedItemsCount = 0;
            const progress = student.courseProgress || 0; // Default to 0 if not provided
            totalCourseProgressSum += progress;
 
            // Calculate student's overall score and populate aggregated quiz stats
            student.quizzes.forEach(quiz => {
              const normTitle = normalizeTitle(quiz.quizTitle);
              const percentage = quiz.maxScore > 0 ? (quiz.score || 0) / quiz.maxScore * 100 : 0;
              if (typeof quiz.score === 'number' && quiz.score !== null) { // Check for null explicitly
                studentTotalScore += percentage;
                studentGradedItemsCount++;
 
                const stat = quizStats.get(normTitle);
                if (stat) {
                  stat.completed++;
                  stat.pending--; // Decrement pending for this student who completed it
                  stat.totalScore += percentage;
                  stat.count++;
                }
              }
            });
 
            // Calculate student's overall score and populate aggregated assignment stats
            student.assignments.forEach(assignment => {
              const normTitle = normalizeTitle(assignment.assignmentTitle);
              if (typeof assignment.grade === 'number' && assignment.grade !== null) { // Check for null explicitly
                studentTotalScore += assignment.grade;
                studentGradedItemsCount++;
 
                const stat = assignmentStats.get(normTitle);
                if (stat) {
                  stat.completed++;
                  stat.pending--; // Decrement pending for this student who completed it
                  stat.totalScore += assignment.grade;
                  stat.count++;
                }
              }
            });

            // Calculate student's overall average score and grade distribution
            if (studentGradedItemsCount > 0) {
              const avg = studentTotalScore / studentGradedItemsCount;
              totalOverallStudentScore += avg;
              studentsWithScores++;
 
              if (avg >= 90) gradeDistributionMap.A++;
              else if (avg >= 80) gradeDistributionMap.B++;
              else if (avg >= 70) gradeDistributionMap.C++;
              else if (avg >= 60) gradeDistributionMap.D++;
              else gradeDistributionMap.F++;
            } else {
              // If a student has no graded items, they contribute to 'F' grade
              gradeDistributionMap.F++;
            }
 
            // Course Completion Distribution
            if (progress >= 76) courseCompletionDistributionMap["76-100%"]++;
            else if (progress >= 51) courseCompletionDistributionMap["51-75%"]++;
            else if (progress >= 26) courseCompletionDistributionMap["26-50%"]++;
            else courseCompletionDistributionMap["0-25%"]++;
 
            // Students completed course logic: average grade >= 70 AND course progress >= 80
            if (studentGradedItemsCount > 0 && (studentTotalScore / studentGradedItemsCount) >= 70 && progress >= 80) {
              studentsCompletedCourseCount++;
            }
          }); // End of student loop
 

          // Calculate overall course averages from aggregated stats
          const courseAverageQuizScore = Array.from(quizStats.values()).reduce((sum, q) => sum + (q.count ? q.totalScore / q.count : 0), 0) / quizStats.size || 0;
          const courseAverageAssignmentScore = Array.from(assignmentStats.values()).reduce((sum, a) => sum + (a.count ? a.totalScore / a.count : 0), 0) / assignmentStats.size || 0;

 
          // Ensure all master assignments/quizzes are included in the final data
          const finalAssignmentCompletion = Array.from(assignmentStats.entries()).map(([title, stat]) => ({
            assignment: titleCase(title), // Convert normalized title back to title case for display
            completed: stat.completed,
            pending: stat.pending,
            averageScore: parseFloat((stat.count ? stat.totalScore / stat.count : 0).toFixed(1))
          }));
 
          const finalQuizCompletion = Array.from(quizStats.entries()).map(([title, stat]) => ({
            quiz: titleCase(title), // Convert normalized title back to title case for display
            completed: stat.completed,
            pending: stat.pending,
            averageScore: parseFloat((stat.count ? stat.totalScore / stat.count : 0).toFixed(1))
          }));
 
 
          return {
            _id: backendCourse.course._id,
            title: backendCourse.course.title,
            category: backendCourse.course.category || "General", // <-- ADD THIS LINE
            totalStudents: totalStudentsInCourse,
            overallProgress: parseFloat((totalCourseProgressSum / totalStudentsInCourse || 0).toFixed(1)),
            gradeDistribution: Object.entries(gradeDistributionMap).map(([name, students]) => ({ name, students })),
            assignmentCompletion: finalAssignmentCompletion,
            averageQuizScore: parseFloat(courseAverageQuizScore.toFixed(1)),
            averageAssignmentScore: parseFloat(courseAverageAssignmentScore.toFixed(1)),
            studentsCompletedCourse: studentsCompletedCourseCount,
            courseCompletionDistribution: Object.entries(courseCompletionDistributionMap).map(([name, students]) => ({ name, students })),
            quizCompletion: finalQuizCompletion
          };
        });
 
        setInstructorCourses(transformedCourses);
        // If there's only one course, automatically select it for detail view
        if (transformedCourses.length === 1) {
            setSelectedCourse(transformedCourses[0]);
        }
      } catch (err: any) {
        console.error("Error fetching instructor analytics data:", err);
        setError(err.message || "Failed to load instructor analytics data.");
      } finally {
        setIsLoading(false);
      }
    };
 
    fetchInstructorAnalyticsData();
  }, []); // Empty dependency array means this runs once on mount

  const renderCustomPieLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, index, name
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 24; // position label further out
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return percent > 0 ? (
      <text
        x={x}
        y={y}
        fill="#393e46"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
        style={{ textShadow: "0 1px 4px #fff" }}
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };
 
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);
  
  // Get unique categories from instructor courses (if you have categories, else remove)
  const categories = ['all', ...new Set(instructorCourses.map(course => (course as any).category || "General"))];

  // Filter and sort courses
  const getFilteredAndSortedCourses = () => {
    let filtered = instructorCourses;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(course =>
        (course.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter (if you have categories)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => ((course as any).category || "General") === selectedCategory);
    }

    // Apply sorting (by studentsCompletedCourse as "recent" example)
    if (sortBy === 'recent') {
      filtered = [...filtered].sort((a, b) =>
        (b.studentsCompletedCourse || 0) - (a.studentsCompletedCourse || 0)
      );
    }

    return filtered;
  };

  const filteredCourses = getFilteredAndSortedCourses();
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * coursesPerPage,
    currentPage * coursesPerPage
  );


  return (
    <>
      {/* Assuming Navbar is a standalone component that manages its own role prop */}
      <Navbar role="instructor" />
      <div className="dashboard-container p-4">
        <h1 className="dashboard-title text-center mb-2">
          Instructor Reporting & Analytics
        </h1>
 
        {isLoading ? (
          <p className="text-center">Loading analytics data...</p>
        ) : error ? (
          <div className="text-center text-danger p-3 mb-2 bg-danger-subtle border border-danger-subtle rounded-3">
            <p>{error}</p>
          </div>
        ) : instructorCourses.length === 0 ? (
            <p className="text-center">No courses found for this instructor.</p>
        ) : !selectedCourse ? (
          // Instructor Home Page: Display Course Cards
          <>
            <div className="search-filter-container mb-3 d-flex flex-wrap justify-content-center gap-3">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ maxWidth: 250 }}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-select"
                style={{ maxWidth: 180 }}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'default')}
                className="form-select"
                style={{ maxWidth: 180 }}
              >
                <option value="default">Default</option>
                <option value="recent">Most Completed</option>
              </select>
            </div>
            <div className="course-cards-container d-flex flex-wrap justify-content-center gap-4">
              {paginatedCourses.map((course) => (
                <div
                  key={course._id}
                  className="course-card card second-color p-4 shadow-sm"
                  onClick={() => setSelectedCourse(course)}
                  style={{ minWidth: "280px", maxWidth: "320px" }}
                >
                  <div className="card-body text-center">
                    {/* Placeholder for icon if needed, not directly from backend yet */}
                    <div className="course-icon mb-2" style={{ fontSize: "3rem" }}>📚</div>
                    <h5 className="card-title">{course.title}</h5>
                    <p className="card-text text-muted">
                      Total Students: <strong className="text-body-secondary">{course.totalStudents}</strong>
                    </p>
                    <p className="card-text text-muted">
                      Avg. Progress: <strong className="text-primary">{course.overallProgress}%</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, idx) => (
                  <button
                    key={idx + 1}
                    className={currentPage === idx + 1 ? 'active' : ''}
                    onClick={() => setCurrentPage(idx + 1)}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          // Individual Course Analytics Page
          <>
            <button
              className="btn btn-outline-secondary mb-4"
              onClick={() => setSelectedCourse(null)}
            >
              &larr; Back to All Courses
            </button>
 
            <h2 className="mb-4 text-center">{selectedCourse.title} Analytics</h2>
 
            {/* Overall Progress for THIS Course */}
            <div className="row mb-4">
              <div className="col-md-4 mb-4">
                <div className="card-section second-color p-4 h-100">
                  <h5 className="section-title text-center mb-2">Overall Avg. Quiz Score</h5>
                  <p className="display-4 text-success text-center">{selectedCourse.averageQuizScore}%</p>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card-section second-color p-4 h-100">
                  <h5 className="section-title text-center mb-2">Overall Avg. Assignment Score</h5>
                  <p className="display-4 text-info text-center">{selectedCourse.averageAssignmentScore}%</p>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="card-section second-color p-4 h-100">
                  <h5 className="section-title text-center mb-2">Students Completed</h5>
                  <p className="display-4 text-primary text-center">{selectedCourse.studentsCompletedCourse}</p>
                </div>
              </div>
            </div>
 
            <div className="row">
              {/* Grade Distribution for Selected Course */}
              <div className="col-md-6 mb-4">
                <div className="section second-color p-4 rounded h-100">
                  <h4 className="section-title">Grade Distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={selectedCourse.gradeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="students"
                        label={renderCustomPieLabel}
                        labelLine={(props) => {
                          // Calculate percent for this slice
                          const total = selectedCourse.gradeDistribution.reduce((sum, entry) => sum + entry.students, 0);
                          const percent = total ? props.value / total : 0;
                          // Only render line if label would be rendered
                          return percent > 0;
                        }}
                      >
                        {selectedCourse.gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} students`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
 
              {/* Assignment Completion for Selected Course */}
              <div className="col-md-6 mb-4">
                <div className="section second-color p-4 rounded h-100">
                  <h4 className="section-title">Assignment Completion</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedCourse.assignmentCompletion} barSize={30} margin={{ top: 5, right: 0, left: 0, bottom: 50 }}>
                      <XAxis dataKey="assignment" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value: number, name: string) => [`${value} students`, name]} />
                      <Legend />
                      <Bar dataKey="completed" stackId="a" fill="#4CAF50" name="Completed" />
                      <Bar dataKey="pending" stackId="a" fill="#FF9800" name="Pending" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
 
              {/* Average Assignment Scores Bar Graph */}
              <div className="col-md-6 mb-4">
                <div className="section second-color p-4 rounded h-100">
                  <h4 className="section-title">Average Assignment Scores</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedCourse.assignmentCompletion} margin={{ top: 5, right: 0, left: 0, bottom: 50 }}>
                      <XAxis dataKey="assignment" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="averageScore" fill="#2196F3" name="Average Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
 
              {/* Course Completion Distribution Chart */}
              <div className="col-md-6 mb-4">
                <div className="section second-color p-4 rounded h-100">
                  <h4 className="section-title">Course Completion Distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={selectedCourse.courseCompletionDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="students"
                        label={renderCustomPieLabel}
                        labelLine={(props) => {
                          // Calculate percent for this slice
                          const total = selectedCourse.courseCompletionDistribution.reduce((sum, entry) => sum + entry.students, 0);
                          const percent = total ? props.value / total : 0;
                          // Only render line if label would be rendered
                          return percent > 0;
                        }}
                      >
                        {selectedCourse.courseCompletionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} students`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
 
              {/* Quiz Completion Graph */}
              <div className="col-md-6 mb-4">
                <div className="section second-color p-4 rounded h-100">
                  <h4 className="section-title">Quiz Completion</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedCourse.quizCompletion} barSize={30} margin={{ top: 5, right: 0, left: 0, bottom: 50 }}>
                      <XAxis dataKey="quiz" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value: number, name: string) => [`${value} students`, name]} />
                      <Legend />
                      <Bar dataKey="completed" stackId="a" fill="#2196F3" name="Completed" />
                      <Bar dataKey="pending" stackId="a" fill="#FFC107" name="Pending" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
 
              {/* Average Quiz Scores Bar Graph */}
              <div className="col-md-6 mb-4">
                <div className="section second-color p-4 rounded h-100">
                  <h4 className="section-title">Average Quiz Scores</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedCourse.quizCompletion} margin={{ top: 5, right: 0, left: 0, bottom: 50 }}>
                      <XAxis dataKey="quiz" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="averageScore" fill="#9C27B0" name="Average Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
 
 
            </div>
          </>
        )}
      </div>
    </>
  );
};
 
export default InstructorReport;