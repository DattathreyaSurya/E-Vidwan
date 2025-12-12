import React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #fff 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 24px rgba(25, 118, 210, 0.08)",
          padding: "3rem 2rem",
          maxWidth: 400,
          width: "100%"
        }}
      >
        <div style={{ fontSize: "4rem", color: "#1976d2", marginBottom: "1rem" }}>⛔</div>
        <h1 style={{ color: "#d32f2f", marginBottom: "0.5rem" }}>Unauthorized</h1>
        <p style={{ color: "#555", marginBottom: "1.5rem" }}>
          You do not have permission to access this page.<br />
          Please check your role.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "0.75rem 2rem",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.2s"
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;