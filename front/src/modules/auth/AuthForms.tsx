import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthForms.css";
import logo from "../../assets/logo2.png";
import "../../declaration.d.ts";
import { FaCaretDown } from "react-icons/fa";
import {
  login,
  signup,
  sendSignupOtp,
  forgotPassword,
  resetPassword,
} from "../../services/authService.ts"; // Import your auth service functions
 
 
const AuthForm = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [role, setRole] = useState<"Student" | "Instructor">("Student");
  const [otp, setOtp] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
 
  useEffect(() => {
    setError("");
    setSuccess("");
  }, [isLogin, isForgotPassword]);
 
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const validatePassword = (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!_%*?&]{6,}$/;
    return passwordRegex.test(password);
  };
 
  const handleSignup = async () => {
    if (!email || !username || !password || !confirmPassword || !role || !otp) {
      setSuccess("");
      return setError("All fields are required.");
    }
    if (!validateEmail(email)) {
      setSuccess("");
      return setError("Invalid email format.");
    }
    if (password !== confirmPassword) {
      setSuccess("");
      return setError("Passwords do not match.");
    }
 
    if (!validatePassword(password)) {
      setSuccess("");
      return setError(
        "Password must be at least 6 characters long, contain at least one uppercase letter, one lowercase letter, and one number."
      );
    }
 
    try {
      const data = await signup(email, username, password, confirmPassword, role, otp);
      setSuccess(data.message);
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setRole("Student");
      setIsLogin(true);
      setError("");
    } catch (error: any) {
      setSuccess("");
      console.error("Error during signup:", error);
      setError(error.response?.data?.error || "Error during signup.");
    }
  };
 
  const handleSendSignupOtp = async () => {
    if (!email) {
      setSuccess("");
      return setError("Email is required.");
    }
    try {
      const data = await sendSignupOtp(email);
      setError("");
      setSuccess(data.message);
    } catch (error: any) {
      console.error("Error during sending signup OTP:", error);
      setSuccess("");
      setError(error.response?.data?.error || "Error during sending signup OTP.");
    }
  };
 
  const handleSendForgotPasswordOtp = async () => {
    if (!email) {
      return setError("Email is required.");
    }
    try {
      const data = await forgotPassword(email);
      setSuccess(data.message);
    } catch (error: any) {
      console.error("Error during sending forgot password OTP:", error);
      setError(error.response?.data?.error || "Error during sending forgot password OTP.");
    }
  };
 
  const handleLogin = async () => {
    if (!email || !password) {
      return setError("Email and password are required.");
    }
    try {
      const data = await login(email, password);
      console.log(data);
      window.sessionStorage.setItem("token", data.token);
      window.sessionStorage.setItem("userRole", data.user.role);
      window.sessionStorage.setItem("userId", data.user.id);
      navigate(data.user.role === "Instructor" ? "/instructor/home" : "/student/home");
    } catch (error: any) {
      console.error("Error during login:", error);
      setError(error.response?.data?.error || "Error during login.");
    }
  };
 
  const handleResetPassword = async () => {
    if (!email || !otp || !password || !confirmPassword) {
      setSuccess("");
      return setError("Email, OTP, new password, and confirm password are required.");
    }
    if (password !== confirmPassword) {
      setSuccess("");
      return setError("Passwords do not match.");
    }
    try {
      const data = await resetPassword(email, otp, password, confirmPassword);
      setError("");
      setSuccess(data.message);
      setIsForgotPassword(false);
    } catch (error: any) {
      setSuccess("");
      console.error("Error during reset password:", error);
      setError(error.response?.data?.error || "Error during reset password.");
    }
  };
 
  return (
    <>
      <img src={logo} className="img img-rounded mx-auto d-block w-25 pt-5" alt="Logo" />
      <div className="form-modal">
        <div className="form-toggle">
          <button
            id="login-toggle"
            onClick={() => {
              setIsLogin(true);
              setIsForgotPassword(false);
            }}
            className={isLogin ? "active-toggle" : "inactive-toggle"}
          >
            Log In
          </button>
          <button
            id="signup-toggle"
            onClick={() => {
              setIsLogin(false);
              setIsForgotPassword(false);
            }}
            className={!isLogin ? "active-toggle" : "inactive-toggle"}
          >
            Sign Up
          </button>
        </div>
        <form className="formData">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={handleSendSignupOtp}>
                Send OTP
              </button>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <input
                type="text"
                placeholder="Choose username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <div className="form-select-wrapper">
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "Student" | "Instructor")}
                >
                  <option>Student</option>
                  <option>Instructor</option>
                </select>
                {/* <FaCaretDown className="fa-caret-down" /> */}
              </div>
              <button type="button" className="btn btn-secondary signup" onClick={handleSignup}>
                Create Account
              </button>
            </>
          )}
 
          {isLogin && !isForgotPassword && (
            <>
              <input
                type="text"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="btn btn-secondary login" onClick={handleLogin}>
                Login
              </button>
              <a
                href="#"
                className="forgot-password-link"
                onClick={(e) => {
                  e.preventDefault();
                  setIsForgotPassword(true);
                }}
              >
                Forgot Password?
              </a>
            </>
          )}
 
          {isForgotPassword && (
            <>
              <input
                type="text"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="button" className="send-otp" onClick={handleSendForgotPasswordOtp}>
                Send OTP
              </button>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" className="reset-password" onClick={handleResetPassword}>
                Reset Password
              </button>
              <button type="button" className="back-to-login" onClick={() => setIsForgotPassword(false)}>
                Back to Login
              </button>
            </>
          )}
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          <hr />
        </form>
      </div>
    </>
  );
};
 
export default AuthForm;
 