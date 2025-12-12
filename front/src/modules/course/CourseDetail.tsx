import React from 'react';
import './CourseDetail.css';

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  content: CourseContent[];
  status: 'Published';
  createdAt: string;
  instructorName: string;
  enrolledStudents: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
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

interface CourseDetailProps {
  course: Course;
  onClose: () => void;
  onEnroll: () => void;
  isEnrolled: boolean;
  onStartLearning: () => void;
}

const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  onClose,
  onEnroll,
  isEnrolled,
  onStartLearning,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getContentTypeCount = (type: CourseContent['type']) => {
    return course.content.filter(item => item.type === type).length;
  };

  return (
    <div className="course-detail-overlay">
      <div className="course-detail-modal">
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        
        <div className="course-header">
          <img src={course.thumbnail} alt={course.title} className="course-banner" />
          <div className="course-info">
            <h1>{course.title}</h1>
            <p className="instructor">By {course.instructorName}</p>
            <div className="meta-info">
              <span className="category">{course.category}</span>
              <span className="date">Created on {formatDate(course.createdAt)}</span>
              {/* <span className="students">{course.enrolledStudents.length} students enrolled</span> */}
            </div>
          </div>
        </div>

        <div className="course-detail-content">
          <section className="course-description">
            <h2>About This Course</h2>
            <p>{course.description}</p>
          </section>

          <section className="course-content-overview">
            <h2>Course Content</h2>
            <div className="content-stats">
              <div className="stat-item">
                <span className="stat-number">{getContentTypeCount('Video') + getContentTypeCount('Youtube Url')}</span>
                <span className="stat-label">Videos</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{getContentTypeCount('Quiz')}</span>
                <span className="stat-label">Quizzes</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{getContentTypeCount('Assignment')}</span>
                <span className="stat-label">Assignments</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{getContentTypeCount('Resource')}</span>
                <span className="stat-label">Resources</span>
              </div>
            </div>
          </section>

          <section className="course-actions">
            {isEnrolled ? (
              <button 
                className="start-learning-button" 
                onClick={onStartLearning}
                aria-label="Start Learning"
              >
                Start Learning
              </button>
            ) : (
              <button 
                className="enroll-button" 
                onClick={onEnroll}
                aria-label="Enroll in Course"
              >
                Enroll Now
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
