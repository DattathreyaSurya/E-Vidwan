import axios from "axios";
 
const API_URL = "http://localhost:5000/api/auth";
 
// Login API
export const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response.data;
};
 
// Signup API
export const signup = async (
  email: string,
  username: string,
  password: string,
  confirmPassword: string,
  role: string,
  otp: string
) => {
  const response = await axios.post(`${API_URL}/signup`, {
    email,
    username,
    password,
    confirmPassword,
    role,
    otp,
  });
  return response.data;
};
 
// Send OTP API
export const sendSignupOtp = async (email: string) => {
  const response = await axios.post(`${API_URL}/send-otp`, { email });
  return response.data;
};
 
// Forgot Password API
export const forgotPassword = async (email: string) => {
  const response = await axios.post(`${API_URL}/forgot-password`, { email });
  return response.data;
};
 
// Reset Password API
export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
  confirmPassword: string
) => {
  const response = await axios.post(`${API_URL}/reset-password`, {
    email,
    otp,
    newPassword,
    confirmPassword,
  });
  return response.data;
};

export const getUserProfile = async () => {
  const token = window.sessionStorage.getItem("token");
  const response = await axios.get(`${API_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export const getUserProfileStats = async () => {
  const token = window.sessionStorage.getItem("token");
  const response = await axios.get(`${API_URL}/profile/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getInstructorProfileStats = async () => {
  const token = window.sessionStorage.getItem("token");
  const response = await axios.get(`${API_URL}/profile/instructor-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};