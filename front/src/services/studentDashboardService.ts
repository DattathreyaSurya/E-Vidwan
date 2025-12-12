import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const studentDashboardService = {
  getStats: async () => {
    const token = window.sessionStorage.getItem('token');
    const response = await axios.get(`${API_URL}/student-dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  getActivities: async () => {
    const token = window.sessionStorage.getItem('token');
    const response = await axios.get(`${API_URL}/student-dashboard/activities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  getUpcomingAssignments: async () => {
    const token = window.sessionStorage.getItem('token');
    const response = await axios.get(`${API_URL}/student-dashboard/upcoming-assignments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
