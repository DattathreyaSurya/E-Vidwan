import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../home/Navbar.tsx";
import { courseService } from "../../services/courseService.ts";
import CourseLearning from "./CourseLearning.tsx";
import "./InstructorCourse.css";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface QuizData {
  questions: QuizQuestion[];
  passingScore: number;
}

interface CourseContent {
  _id?: string;
  type: 'Video' | 'Youtube Url' | 'Quiz' | 'Assignment' | 'Resource';
  title: string;
  description: string;
  videoUrl?: string;
  url?: string;
  quizData?: QuizData;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  content: CourseContent[];
  status: 'Draft' | 'Published' | 'Archived';
  createdAt: string;
  enrolledStudents: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
}

const InstructorCourse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'Student' | 'Instructor'>('Student');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'default'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 6;
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and get role
    const token = window.sessionStorage.getItem("token");
    const storedRole = window.sessionStorage.getItem("userRole");
    
    if (!token) {
      navigate('/', { state: { from: '/instructor/course' } });
      return;
    }

    // Set user role from session storage
    if (storedRole === 'Instructor' || storedRole === 'Student') {
      setUserRole(storedRole);
    }

    fetchCourses();
  }, [navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await courseService.getInstructorCourses();
      setCourses(response.data);
    } catch (err: any) {
      console.error("Error fetching courses:", err);
      if (err.response?.status === 401) {
        // Unauthorized - redirect to login
        navigate('/l', { state: { from: '/instructor/course' } });
        return;
      }
      setError(err.response?.data?.message || "Failed to fetch courses");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await courseService.deleteCourse(courseId);
      setShowDeleteConfirm(null);
      fetchCourses();
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/', { state: { from: '/instructor/course' } });
        return;
      }
      setError(err.response?.data?.message || "Failed to delete course");
    }
  };

  const handleViewCourse = (course: Course) => {
    setSelectedCourse(course);
  };

  // Get unique categories from instructor courses
  const categories = ['all', ...new Set(courses.map(course => course.category))];

  // Filter and sort courses
  const getFilteredAndSortedCourses = () => {
    let filtered = courses;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(course =>
        (course.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (course.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Apply sorting
    if (sortBy === 'recent') {
      filtered = [...filtered].sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
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

  if (isLoading) {
    return (
      <>
        <Navbar userRole={userRole} />
        <div className="container mt-4 text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  if (selectedCourse) {
    return (
      <CourseLearning
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        userRole={userRole}
      />
    );
  }

  return (
    <>
      <Navbar userRole={userRole} />
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>My Courses</h2>
          <button
            className="create-button"
            onClick={() => navigate("/instructor/create-course")}
          >
            Create New Course
          </button>
        </div>

        <div className="search-filter-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="filter-toggle-btn"
            onClick={() => setShowDeleteConfirm('filters')}
          >
            Filters
          </button>
          {showDeleteConfirm === 'filters' && (
            <div className="filters-panel">
              <div className="filter-group">
                <label>Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'default')}
                >
                  <option value="default">Default</option>
                  <option value="recent">Recently Added</option>
                </select>
              </div>
              <button
                className="btn btn-secondary mt-2"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <div className="text-center mt-5">
            <h3>No courses created yet</h3>
            <p>Start by creating your first course!</p>
          </div>
        ) : (
          <>
            <div className="row">
              {paginatedCourses.map((course) => (
                <div key={course._id} className="col-md-4 mb-4">
                  <div className="card h-100">
                    <img
                      src={course.thumbnail}
                      className="card-img-top course-thumbnail"
                      alt={course.title}
                      onClick={() => handleViewCourse(course)}
                      style={{ cursor: 'pointer' }}
                      onError={(e) => {
                        console.error(e);
                      }}
                    />
                    <div className="card-body">
                      <h5 className="card-title" onClick={() => handleViewCourse(course)} style={{ cursor: 'pointer' }}>
                        {course.title}
                      </h5>
                      <p className="card-text description">{course.description}</p>
                      <div className="course-meta">
                        <span className="badge bg-primary me-2">{course.category}</span>
                        <span className="badge bg-secondary me-2">{course.status}</span>
                        <span className="badge bg-info">
                          {course.enrolledStudents.length} Students
                        </span>
                      </div>
                      <div className="course-content mt-2">
                        <small className="text-muted">
                          {course.content.length} {course.content.length === 1 ? 'item' : 'items'}
                        </small>
                      </div>
                    </div>
                    <div className="card-footer">
                      <div className="d-flex justify-content-between">
                        <button
                          className="btn btn-outline-primary btn-secondary edit-button"
                          onClick={() => navigate(`/instructor/courses/${course._id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger delete-button"
                          onClick={() => setShowDeleteConfirm(course._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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
        )}
      </div>
      {/* Delete Confirmation Modal rendered at top level */}
      {showDeleteConfirm && showDeleteConfirm !== 'filters' && (
        <div className="modal-overlay-course-delete">
          <div className="modal-content-course-delete">
            <h4>Delete Course</h4>
            <p>Are you sure you want to delete "{courses.find(c => c._id === showDeleteConfirm)?.title}"?</p>
            <p className="text-danger">This action cannot be undone.</p>
            <div className="modal-actions-course-delete">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteCourse(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstructorCourse;