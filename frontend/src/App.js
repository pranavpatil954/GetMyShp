// ============================================================
// App.js — Root with routing + auth guard
// ============================================================
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";

// Protected route wrapper
function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global CSS for animations */}
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #070f0b; }
          input:focus { border-color: #2ecc71 !important; }
          select:focus { border-color: #2ecc71 !important; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #070f0b; }
          ::-webkit-scrollbar-thumb { background: #1e4a30; border-radius: 3px; }
          .leaflet-container { background: #070f0b !important; }
        `}</style>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
