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
import TurmasAlunosPage from './pages/TurmasAlunosPage';
import AvaliacoesPage from './pages/AvaliacoesPage';
import DiagnosticosPage from './pages/DiagnosticosPage';
import DiagnosticoItens from './pages/DiagnosticoItens';
import DiagnosticoAvaliar from './pages/DiagnosticoAvaliar';
import SAEBPage from './pages/SAEBPage';
import MensagensPage from './pages/MensagensPage';
import PerfilPage from './pages/PerfilPage';

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
      <Route
        path="/turmas"
        element={
          <ProtectedRoute>
            <TurmasAlunosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes"
        element={
          <ProtectedRoute>
            <AvaliacoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diagnosticos"
        element={
          <ProtectedRoute>
            <DiagnosticosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diagnostico-itens"
        element={
          <ProtectedRoute>
            <DiagnosticoItens />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diagnostico-avaliar"
        element={
          <ProtectedRoute>
            <DiagnosticoAvaliar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb"
        element={
          <ProtectedRoute>
            <SAEBPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mensagens"
        element={
          <ProtectedRoute>
            <MensagensPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <PerfilPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
