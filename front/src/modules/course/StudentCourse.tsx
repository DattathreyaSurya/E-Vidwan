import React, { useEffect, useState } from "react";
import './StudentCourse.css';
import Navbar from "../home/Navbar.tsx";
import CourseDetail from "./CourseDetail.tsx";
import { courseService } from "../../services/courseService.ts";
import { FaSearch, FaFilter } from 'react-icons/fa';

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  content: CourseContent[];
  status: 'Published';
  createdAt: string;
  enrolledStudents: Array<{
    _id: string;
    enrolledAt: string;
  }>;
  instructorName?: string;
}

interface CourseContent {
  _id?: string;
  type: 'Video' | 'Youtube Url' | 'Quiz' | 'Assignment' | 'Resource';
  title: string;
  description: string;
  videoUrl?: string;
  url?: string;
  quizData?: {
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: string;
      points: number;
    }>;
    passingScore: number;
  };
}

const StudentCourse: React.FC = () => {
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'default'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 6; // or any number you prefer

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all published courses
      const availableResponse = await courseService.getAvailableCourses();

      // Fetch enrolled courses for the current student
      const enrolledResponse = await courseService.getEnrolledCourses();
      const enrolledCoursesData = enrolledResponse.data;

      // Filter out enrolled courses from available courses
      const enrolledCourseIds = enrolledCoursesData.map(course => course._id);
      const filteredAvailableCourses = availableResponse.data.filter(
        course => !enrolledCourseIds.includes(course._id)
      );
      setAvailableCourses(filteredAvailableCourses);
    } catch (err: any) {
      console.error("Error fetching courses:", err);
      setError(err.response?.data?.message || "Failed to fetch courses");
    } finally {
      setIsLoading(false);
    }
  };
  console.log(availableCourses);

  const handleEnroll = async (course: Course) => {
    // Optimistically remove the course and close the modal
    setAvailableCourses(prev => prev.filter(c => c._id !== course._id));
    setSelectedCourse(null);
  
    try {
      await courseService.enrollInCourse(course._id);
      // Optionally, you can refetch courses here if you want to ensure sync with backend
      // await fetchCourses();
    } catch (err: any) {
      console.error("Error enrolling in course:", err);
      setError(err.response?.data?.message || "Failed to enroll in course");
      // Optionally, add the course back if enrollment fails
      setAvailableCourses(prev => [...prev, course]);
    }
  };

  // Get unique categories from available courses
  const categories = ['all', ...new Set(availableCourses.map(course => course.category))];

  // Filter and sort courses
  const getFilteredAndSortedCourses = () => {
    let filtered = availableCourses;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(course =>
        (course.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (course.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (course.instructorName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
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
        <Navbar userRole="student" />
        <div className="container mt-4 text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar userRole="student" />
      <div className="student-course-page">
        <h2 className="heading">Available Courses</h2>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="search-filter-container">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filters
          </button>

          {showFilters && (
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
            </div>
          )}
        </div>

        <div className="course-container">
          {filteredCourses.length === 0 ? (
            <p style={{ textAlign: 'center', width: '100%', color: '#666' }}>
              No courses match your search criteria
            </p>
          ) : (
            <>
            <div className="row">
              {paginatedCourses.map((course) => (
                <div key={course._id} className="col-md-4 mb-4">
                  <div
                    className="course-card"
                    onClick={() => setSelectedCourse(course)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="course-image"
                    />
                    <div className="course-details">
                      <h3>{course.title}</h3>
                      <p><strong>Instructor:</strong> {course.instructor.username}</p>
                      <p><strong>Category:</strong> {course.category}</p>
                      <p className="description">{course.description}</p>
                      <div className="course-meta">
                        <span className="badge bg-primary me-2">{course.category}</span>
                        <span className="badge bg-info">
                          {course.content.length} {course.content.length === 1 ? 'item' : 'items'}
                        </span>
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
      </div>

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onEnroll={() => handleEnroll(selectedCourse)}
          isEnrolled={false}
          onStartLearning={() => {}} // Not needed here
        />
      )}
    </>
  );
};

export default StudentCourse;