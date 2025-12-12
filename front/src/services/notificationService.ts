// frontend/src/services/notificationService.ts
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const notificationService = {
  getMyNotifications: async () => {
    const token = window.sessionStorage.getItem('token');
    const response = await axios.get(`${API_URL}/notifications/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  markAsRead: async (id: string) => {
    const token = window.sessionStorage.getItem('token');
    await axios.post(`${API_URL}/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  markAllAsRead: async () => {
    const token = window.sessionStorage.getItem('token');
    await axios.post(`${API_URL}/notifications/mark-all-read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  deleteNotification: async (id: string) => {
    const token = window.sessionStorage.getItem('token');
    await axios.delete(`${API_URL}/notifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  deleteAllNotifications: async () => {
    const token = window.sessionStorage.getItem('token');
    await axios.delete(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};