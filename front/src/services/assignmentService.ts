import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Helper function to get auth header
const getAuthHeader = () => {
    const token = window.sessionStorage.getItem("token");
    return {
        Authorization: `Bearer ${token}`
    };
};

export const assignmentService = {

    //Get previous submission for this assignment
    getAssignmentSubmission: async (assignmentId: string) => {
        try {
            const response = await axios.get(
                `${API_URL}/assignments/${assignmentId}/my`,
                { headers: getAuthHeader() }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error getting assignment submission:', error);
            throw new Error(error.response?.data?.message || 'Failed to get assignment submission');
        }
    },


    //Upload assignment file in backend folder
    uploadAssignmentFile: async (file: File, onProgress?: (progress: number) => void): Promise<{ fileUrl: string }> => {
        if (!file) throw new Error('No file provided');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_URL}/assignments/uploadAssignment`, formData, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(percentCompleted);
                    }
                },
            });

            if (!response.data.success || !response.data.fileUrl) {
                throw new Error('Failed to upload assignment file');
            }

            return { fileUrl: response.data.fileUrl }; // Return the file URL in an object
        } catch (error: any) {
            console.error('Error uploading assignment file:', error);
            throw new Error(error.response?.data?.message || 'Failed to upload assignment file. Please try again.');
        }
    },




    //Submit assignment with file upload
    submitAssignment: async (courseId: string, assignmentId: string, fileUrl: string) => {
        try {
            const response = await axios.post(
                `${API_URL}/assignments/${courseId}/${assignmentId}`,
                { fileUrl },
                { headers: getAuthHeader() }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error submitting assignment:', error);
            throw new Error(error.response?.data?.message || 'Failed to submit assignment');
        }
    },

    // Fetch courses created by the instructor
    getCourses: async () => {
        try {
            const response = await axios.get(`${API_URL}/courses/all`, {
                headers: getAuthHeader(),
            });
            return response.data.data;
        } catch (error: any) {
            console.error('Error fetching courses:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch courses');
        }
    },

    // Fetch assignments for a specific course
    getAssignments: async (courseId: string) => {
        try {
            const response = await axios.get(`${API_URL}/assignments/${courseId}/assignments`, {
                headers: getAuthHeader(),
            });
            return response.data.data;
        } catch (error: any) {
            console.error('Error fetching assignments:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch assignments');
        }
    },

    // Fetch submissions for a specific course and assignment
    getSubmissions: async (courseId: string, assignmentId: string) => {
        try {
            const response = await axios.get(`${API_URL}/assignments/course/${courseId}/assignment/${assignmentId}/submissions`, {
                headers: getAuthHeader(),
            });
            return response.data.data;
        } catch (error: any) {
            console.error('Error fetching submissions:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch submissions');
        }
    },

    // Grade a submission
    gradeSubmission: async (submissionId: string, grade: number, feedback: string) => {
        try {
            const response = await axios.patch(`${API_URL}/assignments/${submissionId}/grade`, { grade, feedback }, {
                headers: getAuthHeader(),
            });
            return response.data;
        } catch (error: any) {
            console.error('Error grading submission:', error);
            throw new Error(error.response?.data?.message || 'Failed to grade submission');
        }
    },
};