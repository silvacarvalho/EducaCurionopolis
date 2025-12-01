import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PerfilUsuario } from './types';

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
import ImportacaoAlunosPage from './pages/ImportacaoAlunosPage';
import ConfiguracoesGraficoPage from './pages/ConfiguracoesGraficoPage';

// Simple Protected Route for authenticated users only
const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          <AuthenticatedRoute>
            <Dashboard />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute
            allowedProfiles={[
              PerfilUsuario.GESTAO_MUNICIPAL,
              PerfilUsuario.DIRETOR_COORDENADOR,
              PerfilUsuario.PROFESSOR
            ]}
          >
            <RelatoriosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/escolas"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <EscolasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/professores"
        element={
          <ProtectedRoute
            allowedProfiles={[
              PerfilUsuario.GESTAO_MUNICIPAL,
              PerfilUsuario.DIRETOR_COORDENADOR
            ]}
          >
            <ProfessoresPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/turmas"
        element={
          <AuthenticatedRoute>
            <TurmasAlunosPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/avaliacoes"
        element={
          <AuthenticatedRoute>
            <AvaliacoesPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/diagnosticos"
        element={
          <AuthenticatedRoute>
            <DiagnosticosPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/diagnostico-itens"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <DiagnosticoItens />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diagnostico-avaliar"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.PROFESSOR]}>
            <DiagnosticoAvaliar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb"
        element={
          <AuthenticatedRoute>
            <SAEBPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/mensagens"
        element={
          <AuthenticatedRoute>
            <MensagensPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <AuthenticatedRoute>
            <PerfilPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/importacao-alunos"
        element={
          <ProtectedRoute
            allowedProfiles={[
              PerfilUsuario.GESTAO_MUNICIPAL,
              PerfilUsuario.DIRETOR_COORDENADOR
            ]}
          >
            <ImportacaoAlunosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes-grafico"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <ConfiguracoesGraficoPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
