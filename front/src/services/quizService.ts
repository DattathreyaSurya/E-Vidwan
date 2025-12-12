import axios from 'axios';
 
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
 
// Helper function to get auth header
const getAuthHeader = () => {
    const token = window.sessionStorage.getItem("token");
    return {
        Authorization: `Bearer ${token}`
    };
};
 
interface QuizAnswer {
    questionIndex: number;
    selectedAnswer: string;
  }
 
export const quizService = {
    getQuizById: async (courseId: string, quizId: string) => {
        const response = await axios.get(`${API_URL}/courses/${courseId}/quizzes/${quizId}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },
 
 
    submitQuizAttempt: async (courseId: string, quizId: string, answers: QuizAnswer[]) => {
        try {
            const response = await axios.post(
                `${API_URL}/quizzes/${courseId}/${quizId}/attempt`,
                { answers },
                { headers: getAuthHeader() }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error submitting quiz:', error);
            throw new Error(error.response?.data?.message || 'Failed to submit quiz');
        }
    },
 
 
    getQuizAttempt: async (quizId: string) => {
        try {
            const response = await axios.get(
                `${API_URL}/quizzes/${quizId}/my`,
                { headers: getAuthHeader() }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error getting quiz attempt:', error);
            throw new Error(error.response?.data?.message || 'Failed to get quiz attempt');
        }
    },

    clearQuizAttempt: async (quizId: string) => {
        try {
            const response = await axios.delete(
                `${API_URL}/quizzes/${quizId}/clear`,
                { headers: getAuthHeader() }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error clearing quiz attempt:', error);
            throw new Error(error.response?.data?.message || 'Failed to clear quiz attempt');
        }
    },
}
 