import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./modules/auth/AuthForms.tsx";
import StudentCourse from "./modules/course/StudentCourse.tsx";
import InstructorCourse from "./modules/course/InstructorCourse.tsx";
import InstructorHome from "./modules/home/InstructorHome.tsx";
import StudentHome from "./modules/home/StudentHome.tsx";
import StudentReport from "./modules/report/StudentReport.tsx";
import InstructorReport from "./modules/report/InstructorReport.tsx";
import InstructorAssignment from "./modules/course/InstructorAssignment.tsx"
import EditCourse from "./modules/course/EditCourse.tsx";
import CreateCourse from "./modules/course/CreateCourse.tsx";
import NotificationsPage from './modules/home/NotificationsPage.tsx';
import EnrolledCourse from "./modules/course/EnrolledCourse.tsx";
import Profile from "./modules/home/Profile.tsx";

// Protected Route Component
type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: string[];
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = sessionStorage.getItem('userRole');
  const isAuthenticated = sessionStorage.getItem('token');

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to appropriate home page based on role
    return <Navigate to={`/${userRole?.toLowerCase() || 'student'}/home`} replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<AuthForm />} />
          <Route path="/profile" element={<Profile />} />

          {/* Instructor Routes */}
          <Route
            path="/instructor/home"
            element={
              <ProtectedRoute allowedRoles={['Instructor']}>
                <InstructorHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/course"
            element={
              <ProtectedRoute allowedRoles={['Instructor']}>
                <InstructorCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/create-course"
            element={
              <ProtectedRoute allowedRoles={['Instructor']}>
                <CreateCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/edit"
            element={
              <ProtectedRoute allowedRoles={['Instructor']}>
                <EditCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/report"
            element={
              <ProtectedRoute allowedRoles={['Instructor']}>
                <InstructorReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/assignment"
            element={
              <ProtectedRoute allowedRoles={['Instructor']}>
                <InstructorAssignment />
              </ProtectedRoute>
            }
            />
          <Route
            path="/student/home"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/enrolled-courses"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <EnrolledCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/course"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/report"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentReport />
              </ProtectedRoute>
            }
          />

          {/* Notifications Route */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['Instructor', 'Student']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
  );
};

export default App;