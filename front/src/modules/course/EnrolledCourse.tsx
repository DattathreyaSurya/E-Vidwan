import React, { useEffect, useState } from 'react';
import Navbar from '../home/Navbar.tsx';
import { courseService } from '../../services/courseService.ts';
import CourseLearning from './CourseLearning.tsx';
import './EnrolledCourse.css';
 
interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  thumbnail: string;
  content: any[];
  createdAt: string;
  enrolledStudents: Array<{
    _id: string;
    enrolledAt: string;
  }>;
}
 
const EnrolledCourse: React.FC = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isViewingCourse, setIsViewingCourse] = useState(false);
 
  // Search & filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'default'>('default');
 
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 6;
 
  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await courseService.getEnrolledCourses();
        setEnrolledCourses(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch enrolled courses");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnrolledCourses();
  }, []);
  console.log(enrolledCourses);
 
  // Reset page on filter/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);
 
  // Get unique categories from enrolled courses
  const categories = ['all', ...new Set(enrolledCourses.map(course => course.category))];
 
  // Filter and sort courses
  const getFilteredAndSortedCourses = () => {
    let filtered = enrolledCourses;
 
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(course =>
        (course.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (course.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (course.instructor.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
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
 
  if (isViewingCourse && selectedCourse) {
    const userId = sessionStorage.getItem('userId');
    return (
      <CourseLearning
        course={selectedCourse}
        onClose={() => {
          setIsViewingCourse(false);
          setSelectedCourse(null);
        }}
        userRole="Student"
        currentUserId={userId || undefined}
      />
    );
  }
 
  return (
    <>
      <Navbar userRole="student" />
      <div className="enrolled-course">
        <h1>Enrolled Courses</h1>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
 
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
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
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
 
        {isLoading ? (
          <div className="text-center mt-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <p>You haven't enrolled in any courses yet.</p>
        ) : (
          <>
            <div className="row">
              {paginatedCourses.map((course) => (
                <div
                  key={course._id}
                  className="col-md-4 mb-4"
                  onClick={() => {
                    setSelectedCourse(course);
                    setIsViewingCourse(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="course-card">
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
    </>
  );
};
 
export default EnrolledCourse;