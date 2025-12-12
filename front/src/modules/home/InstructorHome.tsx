import React, { useEffect, useState } from 'react';
import Navbar from '../home/Navbar.tsx';
import './InstructorHome.css';
import { useNavigate } from 'react-router-dom';
import { 
  FaPlusCircle, 
  // FaClipboardList, 
  // FaComments, 
  FaChalkboardTeacher,
  FaChartLine,
  FaBook,
  FaGraduationCap,
  FaBell,
  FaPlus
} from 'react-icons/fa';
import { dashboardService, DashboardStats, Activity } from '../../services/dashboardService.ts';

const InstructorHome: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    activeCourses: 0,
    enrolledStudents: 0,
    pendingAssessments: 0,
    unreadMessages: 0 // Notifications not yet implemented
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, activitiesResponse] = await Promise.all([
          dashboardService.getDashboardStats(),
          dashboardService.getRecentActivities()
        ]);

        setStats(statsResponse.data);
        setActivities(activitiesResponse.data);
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

  const modules = [
    { icon: <FaPlusCircle />, label: "Create Course", route: "/instructor/create-course" },
    { icon: <FaChartLine />, label: "Course Analytics", route: "/instructor/report" },
    // { icon: <FaBook />, label: "Course Materials", route: "/instructor/materials" },
    // { icon: <FaGraduationCap />, label: "Student Progress", route: "/instructor/progress" },
    { icon: <FaChalkboardTeacher />, label: "Grade Assignments", route: "/instructor/assignment" },
    // { icon: <FaComments />, label: "Communication", route: "/instructor/communication" },
  ];

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  if (loading) {
    return (
      <>
        <Navbar userRole="Instructor" />
        <div className="instructor-home">
          <div className="loading">Loading dashboard data...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar userRole="Instructor" />
        <div className="instructor-home">
          <div className="error">{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar userRole="Instructor" />
      <div className="instructor-home">
        <div className="welcome-section">
          <h1 className="title">Welcome, Instructor!</h1>
          <p className="subtitle">Manage your courses and track student progress</p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <FaBook className="stat-icon" />
            <div className="stat-info">
              <h3>{stats.activeCourses}</h3>
              <p>Active Courses</p>
            </div>
          </div>
          <div className="stat-card">
            <FaGraduationCap className="stat-icon" />
            <div className="stat-info">
              <h3>{stats.enrolledStudents}</h3>
              <p>Enrolled Students</p>
            </div>
          </div>
          <div className="stat-card">
            <FaChalkboardTeacher className="stat-icon" />
            <div className="stat-info">
              <h3>{stats.pendingAssignments}</h3>
              <p>Pending Assignments</p>
            </div>
          </div>
          {/* Notifications card removed as it's not yet implemented */}
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

        <div className="module-grid">
          {modules.map((mod, index) => (
            <div key={index} className="module-card" onClick={() => handleNavigate(mod.route)}>
              <div className="module-icon">{mod.icon}</div>
              <div className="module-label">{mod.label}</div>
            </div>
          ))}
        </div>

        <button className="fab" onClick={() => navigate('/instructor/create-course')}>
          <FaPlus />
        </button>
      </div>
    </>
  );
};

export default InstructorHome;