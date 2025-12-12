import React, { useEffect, useState } from 'react';
import './StudentHome.css';
import Navbar from '../home/Navbar.tsx';
import { 
  FaBookOpen,
  FaCalendarAlt, 
  FaClipboardList,
  FaBell,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { studentDashboardService } from '../../services/studentDashboardService.ts';

interface DashboardStats {
  enrolledCourses: number;
  unreadMessages: number;
}

interface Activity {
  type: 'notification';
  message: string;
  time: string;
}

const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    unreadMessages: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);  

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, activitiesResponse, assignmentsResponse] = await Promise.all([
          studentDashboardService.getStats(),
          studentDashboardService.getActivities(),
          studentDashboardService.getUpcomingAssignments()
        ]);
        setStats(statsResponse.data);
        setActivities(activitiesResponse.data);
        setUpcomingAssignments(assignmentsResponse.data);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar userRole="Student" />
        <div className="student-home">
          <div className="loading">Loading dashboard data...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar userRole="Student" />
        <div className="student-home">
          <div className="error">{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar userRole="Student" />
      <div className="student-home">
        <div className="welcome-section">
          <h1 className="title">Welcome, Student!</h1>
          <p className="subtitle">Track your progress and continue learning</p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <FaBookOpen className="stat-icon" />
            <div className="stat-info">
              <h3>{stats.enrolledCourses}</h3>
              <p>Enrolled Courses</p>
            </div>
          </div>
          <div className="stat-card">
            <FaBell className="stat-icon" />
            <div className="stat-info">
              <h3>{stats.unreadMessages}</h3>
              <p>Unread Messages</p>
            </div>
          </div>
        </div>

        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {activities.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-message">{activity.message}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
        {upcomingAssignments.length > 0 && (
          <div className="upcoming-assignments">
            <h2>Upcoming Assignments</h2>
            <ul>
              {upcomingAssignments.map((assignment, idx) => (
                <li key={assignment.assignmentId || idx}>
                  <strong>{assignment.assignmentTitle}</strong>
                  {" "}({assignment.courseTitle})<br />
                  Due: {new Date(assignment.dueDate).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="module-grid">
          <div className="module-card" onClick={() => navigate('/student/course')}>
            <FaBookOpen className="module-icon" />
            <div className="module-label">My Courses</div>
            <p className="module-description">View and continue your enrolled courses</p>
          </div>

          <div className="module-card" onClick={() => navigate('/student/report')}>
            <FaCalendarAlt className="module-icon" />
            <div className="module-label">Progress Report</div>
            <p className="module-description">Track your progress and performance</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentHome;
