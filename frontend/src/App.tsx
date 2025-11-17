import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RelatoriosPage from './pages/RelatoriosPage';
import EscolasPage from './pages/EscolasPage';
import ProfessoresPage from './pages/ProfessoresPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Box>Carregando...</Box>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <RelatoriosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/escolas"
        element={
          <ProtectedRoute>
            <EscolasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/professores"
        element={
          <ProtectedRoute>
            <ProfessoresPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
