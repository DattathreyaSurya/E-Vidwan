import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth header
const getAuthHeader = () => {
  const token = window.sessionStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`
  };
};

export interface DashboardStats {
  activeCourses: number;
  enrolledStudents: number;
  pendingAssessments: number;
  // unreadMessages: number; // Notifications not yet implemented
}

export interface Activity {
  type: 'submission' | 'enrollment' | 'notification'; // Removed 'notification' type
  message: string;
  time: string;
}

export const dashboardService = {
  getDashboardStats: async (): Promise<{ success: boolean; data: DashboardStats }> => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard statistics');
    }
  },

  getRecentActivities: async (): Promise<{ success: boolean; data: Activity[] }> => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/activities`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching recent activities:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch recent activities');
    }
  }
}; 