import React, { useState, useEffect } from "react";
import "./StudentReport.css";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Navbar from "../home/Navbar.tsx";
import { getAnalyticsByStudent } from "../../services/analyticsService.ts";

// Interface definitions for type safety
interface QuizScore {
  name: string;
  score: number;
  quizId: string;
  attemptedAt: string;
}

interface AssignmentScore {
  name: string;
  score: number;
}

interface CourseCompletionData {
  progress: number;
  completedAt: string | null;
}

interface Course {
  _id: string;
  title: string;
  quizzes: QuizScore[];
  assignments: AssignmentScore[];
  completionData: CourseCompletionData;
  category?: string;
}

const COLORS = ["#4CAF50", "#FF7043"];

const coursesPerPage = 6;

const StudentReport: React.FC = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search, filter, sort, pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'default'>('default');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        const studentId = sessionStorage.getItem("userId") || "";
        if (!studentId) {
          console.error("Student ID not found in session storage.");
          setIsLoading(false);
          return;
        }
        const data = await getAnalyticsByStudent(studentId);
        const formattedCourses = data.data.enrolledCourses.map((course: any) => {
          const latestQuizzes: { [key: string]: QuizScore } = {};
          course.quizzes.forEach((quiz: any) => {
            const quizId = quiz.quizId;
            const currentScore = (quiz.score / quiz.maxScore) * 100;
            if (
              !latestQuizzes[quizId] ||
              new Date(quiz.attemptedAt) > new Date(latestQuizzes[quizId].attemptedAt)
            ) {
              latestQuizzes[quizId] = {
                name: quiz.quizTitle,
                score: currentScore,
                quizId: quizId,
                attemptedAt: quiz.attemptedAt,
              };
            }
          });
          const processedQuizzes = Object.values(latestQuizzes);
          return {
            _id: course.courseId._id,
            title: course.courseId.title,
            category: course.courseId.category || "General",
            quizzes: processedQuizzes,
            assignments: course.assignments.map((assignment: any) => ({
              name: assignment.assignmentTitle,
              score: assignment.grade,
            })),
            completionData: {
              progress: course.completionData.progress,
              completedAt: course.completionData.completedAt,
            },
          };
        });
        setEnrolledCourses(formattedCourses);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalyticsData();
  }, []);

  // Reset page on filter/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  // Get unique categories from enrolled courses
  const categories = ['all', ...new Set(enrolledCourses.map(course => course.category || "General"))];

  // Filter and sort courses
  const getFilteredAndSortedCourses = () => {
    let filtered = enrolledCourses;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(course =>
        (course.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => (course.category || "General") === selectedCategory);
    }

    // Apply sorting (assuming you want to sort by completionData.completedAt)
    if (sortBy === 'recent') {
      filtered = [...filtered].sort((a, b) =>
        new Date(b.completionData.completedAt || 0).getTime() - new Date(a.completionData.completedAt || 0).getTime()
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

  // Sets the selected course when a user clicks a course card
  const handleCourseClick = (courseId: string) => {
    const course = enrolledCourses.find((c) => c._id === courseId);
    if (course) {
      setSelectedCourse(course);
    }
  };

  // Prepares the data for the completion progress pie chart
  const getCourseCompletionData = (progress: number) => [
    { name: "Completed", value: progress },
    { name: "Remaining", value: 100 - progress },
  ];

  const calculateAverageScore = (scores: QuizScore[] | AssignmentScore[]) => {
    if (scores.length === 0) return 0;
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
    return (totalScore / scores.length).toFixed(2);
  };

  return (
    <>
      <Navbar userRole="student" />
      <div className="student-dashboard p-4">
        <h1 className="dashboard-heading text-center mb-2">
          Student Reporting & Analytics
        </h1>

        {isLoading ? (
          <p className="text-center">Loading...</p>
        ) : !selectedCourse ? (
          <>
            <div className="row">
              <div className="col-12">
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
                    <option value="recent">Recently Completed</option>
                  </select>
                </div>
                <div className="course-cards-container d-flex flex-wrap justify-content-center gap-4">
                  {paginatedCourses.map((course) => (
                    <div
                      key={course._id}
                      className="course-card card second-color p-4 shadow-sm"
                      onClick={() => handleCourseClick(course._id)}
                      style={{
                        cursor: "pointer",
                        minWidth: "250px",
                        maxWidth: "300px",
                      }}
                    >
                      <div className="card-body text-center">
                        <h5 className="card-title">{course.title}</h5>
                        <p className="card-text">
                          Progress: <strong>{course.completionData.progress}%</strong>
                        </p>
                        <p className="card-text">
                          Category: <strong>{course.category || "General"}</strong>
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
              </div>
            </div>
          </>
        ) : (
          <>
            <button
              className="btn btn-outline-secondary mb-4"
              onClick={() => setSelectedCourse(null)}
            >
              &larr; Back to All Courses
            </button>

            <h2 className="mb-4 text-center">{selectedCourse.title} Analytics</h2>

            <div className="row">
              <div className="col-md-6 mb-4">
                <div className="card-section second-color p-4 h-100">
                  <h4 className="section-title">Course Completion</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={getCourseCompletionData(selectedCourse.completionData.progress)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {getCourseCompletionData(selectedCourse.completionData.progress).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-md-6 mb-4">
                <div className="card-section second-color p-4 h-100">
                  <h4 className="section-title">Quiz Performance (%)</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedCourse.quizzes}>
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#4CAF50" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-md-6 mb-4">
                <div className="card-section second-color p-4 h-100">
                  <h4 className="section-title">Assignment Scores</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedCourse.assignments}>
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#2196F3" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-md-6 mb-4">
                <div className="card-section second-color p-4 h-100">
                  <h4 className="section-title">Average Scores</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={[
                        {
                          name: "Quiz Avg",
                          score: calculateAverageScore(selectedCourse.quizzes),
                        },
                        {
                          name: "Assignment Avg",
                          score: calculateAverageScore(selectedCourse.assignments),
                        },
                      ]}
                    >
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#FF7043" />
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

export default StudentReport;