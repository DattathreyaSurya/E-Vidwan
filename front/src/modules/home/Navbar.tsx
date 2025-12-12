import React, { useState, useRef, useEffect } from 'react';
import './Navbar.css';
import logo from '../../assets/logo2.png';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaBars, FaTimes, FaUserCircle } from 'react-icons/fa';
import { notificationService } from '../../services/notificationService.ts';

type NavbarProps = {
  userRole: string;
};

const Navbar: React.FC<NavbarProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    notificationService.getMyNotifications().then(res => {
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
    });
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      notificationService.markAsRead(notification._id).then(() => {
        setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      });
    }
    setShowNotifications(false);
    navigate('/notifications');
  };

  const currentRole = sessionStorage.getItem('userRole') || userRole;

  const handleNavigation = (path: string) => {
    setMobileMenuOpen(false);
    navigate(`/${currentRole.toLowerCase()}/${path}`);
  };

  const handleClick = () => {
    setMobileMenuOpen(false);
    handleNavigation('home');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userRole');
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => {
    const currentRole = sessionStorage.getItem('userRole') || userRole;
    const base = `/${currentRole.toLowerCase()}/${path}`;
    return location.pathname.startsWith(base);
  };

  return (
    <nav className="navbar">
      <div className="logo-section">
        <img src={logo} alt="e-vidwan logo" className="logo home" onClick={handleClick}/>
      </div>
      <div className="hamburger" onClick={() => setMobileMenuOpen(v => !v)}>
        {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </div>
      <ul className={`nav-links${mobileMenuOpen ? ' open' : ''}`}>
        <li
          className={`course-dropdown${isActive('course') ? ' active' : ''}`}
          onClick={() => handleNavigation('course')}
        >
          <span>Courses</span>
        </li>
        {currentRole === 'Student' && (
          <li
            className={`course-dropdown${isActive('enrolled-courses') ? ' active' : ''}`}
            onClick={() => handleNavigation('enrolled-courses')}
          >
            <span>My Courses</span>
          </li>
        )}
        {currentRole === 'Instructor' && (
          <>
            <li
              className={isActive('create-course') ? 'active' : ''}
              onClick={() => handleNavigation('create-course')}
            >
              Create Course
            </li>
            <li
              className={location.pathname.startsWith('/instructor/assignment') ? 'active' : ''}
              onClick={() => navigate('/instructor/assignment')}
            >
              Grade Assignments
            </li>
          </>
        )}
        <li
          className={isActive('report') ? 'active' : ''}
          onClick={() => handleNavigation('report')}
        >
          Performance
        </li>
        <li style={{ position: 'relative' }} ref={notificationsRef}>
          <span className="nav-item" onClick={() => setShowNotifications(v => !v)}>
            <FaBell style={{ fontSize: 20 }} />
            {unreadCount > 0 && (
              <span className="bell-badge">{unreadCount}</span>
            )}
          </span>
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown-header">
              <span>Notifications</span>
                <button
                  className="notif-close-btn"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close notifications"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#393e46",
                    fontSize: 20,
                    cursor: "pointer",
                    marginLeft: 8,
                  }}
                >
                  <FaTimes />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="notifications-dropdown-empty">No notifications</div>
              ) : notifications.slice(0, 6).map(n => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`notifications-dropdown-item${n.isRead ? '' : ' unread'}`}
                >
                  <div>{n.message}</div>
                  <div className="notifications-dropdown-date">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
              <div className="notifications-dropdown-footer">
                <span
                  className="notifications-dropdown-footer-link"
                  onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                >
                  View all
                </span>
              </div>
            </div>
          )}
        </li>
        <li
          className="nav-item profile-icon"
          onClick={() => navigate(`/profile`)}
          title="Profile"
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <FaUserCircle size={22} style={{ marginRight: 6 }} />
          <span className="d-none d-md-inline">Profile</span>
        </li>
        <li onClick={handleLogout} className="logout-btn">Logout</li>
      </ul>
    </nav>
  );
};

export default Navbar;