import axios from "axios";
 
const API_BASE_URL = "http://localhost:5000/api/analytics"; // Replace with your backend URL if different
 
/**
 * Fetch analytics data for a specific student.
 * @param studentId - The ID of the student.
 * @returns Analytics data for the student.
 */
export const getAnalyticsByStudent = async (studentId: string) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token is missing.");
    }
 
    const response = await axios.get(`${API_BASE_URL}/student/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching analytics data for student:", error);
    throw error;
  }
};

export const updateCourseProgress = async (courseId: string, progress: number) => {
  const token = window.sessionStorage.getItem("token");
  return axios.patch(
    `${API_BASE_URL}/progress/${courseId}`,
    { progress },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}