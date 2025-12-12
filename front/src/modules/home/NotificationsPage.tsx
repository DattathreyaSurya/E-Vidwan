import React, { useEffect, useState } from 'react';
import { notificationService } from '../../services/notificationService.ts';
import Navbar from './Navbar.tsx'
import './NotificationsPage.css';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const userRole = sessionStorage.getItem('userRole');
  useEffect(() => {
    notificationService.getMyNotifications()
      .then(res => setNotifications(res.data))
      .catch(() => setError('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id).then(() => {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    });
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead().then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    });
  };

  const handleDeleteNotification = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDeleteNotification = (id: string) => {
    notificationService.deleteNotification(id).then(() => {
      setNotifications(prev => prev.filter(n => n._id !== id));
      setShowDeleteConfirm(null);
    });
  };

  const handleDeleteAllNotifications = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAllNotifications = () => {
    notificationService.deleteAllNotifications().then(() => {
      setNotifications([]);
      setShowDeleteAllConfirm(false);
    });
  };

  if (loading) return <div className="notifications-page"><div className="loading">Loading notifications...</div></div>;
  if (error) return <div className="notifications-page"><div className="error">{error}</div></div>;

  return (
    <>
    <Navbar userRole={userRole}/>
    <div className="notifications-page">
      <h2>Notifications</h2>
      <div className="notification-actions">
          <button className="mark-all-btn" onClick={handleMarkAllAsRead} disabled={notifications.length === 0 || notifications.every(n => n.isRead)}>Mark All as Read</button>
          <button className="delete-all-btn" onClick={handleDeleteAllNotifications} disabled={notifications.length === 0}>Delete All</button>
        </div>
      {notifications.length === 0 ? (
        <div className="no-notifications">No notifications yet.</div>
      ) : (
        <ul className="notifications-list">
          {notifications.map(n => (
            <li key={n._id} className={`notification-item${n.isRead ? ' read' : ''}`}>
              <div className="notification-main">
                <span className="notification-type">{n.type}</span>
                <span className="notification-message">{n.message}</span>
              </div>
              <div className="notification-meta">
                <span className="notification-date">{new Date(n.createdAt).toLocaleString()}</span>
                {!n.isRead && <button className="mark-read-btn" onClick={() => handleMarkAsRead(n._id)}>Mark as read</button>}
                <button className="delete-btn" onClick={() => handleDeleteNotification(n._id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>

          {/* Single notification delete confirmation modal */}
          {showDeleteConfirm && (
        <div className="modal-overlay-notification">
          <div className="modal-content-notification">
            <h4>Delete Notification</h4>
            <p>Are you sure you want to delete this notification?</p>
            <p className="text-danger">This action cannot be undone.</p>
            <div className="modal-actions-notification">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => confirmDeleteNotification(showDeleteConfirm!)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all notifications confirmation modal */}
      {showDeleteAllConfirm && (
        <div className="modal-overlay-notification">
          <div className="modal-content-notification">
            <h4>Delete All Notifications</h4>
            <p>Are you sure you want to delete <b>all</b> notifications?</p>
            <p className="text-danger">This action cannot be undone.</p>
            <div className="modal-actions-notification">
              <button className="btn btn-secondary" onClick={() => setShowDeleteAllConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeleteAllNotifications}>Delete All</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationsPage; 