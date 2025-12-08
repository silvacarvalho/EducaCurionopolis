import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PerfilUsuario } from './types';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardNew from './pages/DashboardNew';
import RelatoriosPage from './pages/RelatoriosPage';
import EscolasPage from './pages/EscolasPage';
import ProfessoresPage from './pages/ProfessoresPage';
import TurmasAlunosPage from './pages/TurmasAlunosPage';
import AvaliacoesPage from './pages/AvaliacoesPage';
import DiagnosticosPage from './pages/DiagnosticosPage';
import DiagnosticoItens from './pages/DiagnosticoItens';
import DiagnosticoAvaliar from './pages/DiagnosticoAvaliar';
import MensagensPage from './pages/MensagensPage';
import PerfilPage from './pages/PerfilPage';
import ImportacaoAlunosPage from './pages/ImportacaoAlunosPage';
import ConfiguracoesGraficoPage from './pages/ConfiguracoesGraficoPage';

// SAEB V2 Pages
import SAEBV2DescritoresPage from './pages/SAEBV2DescritoresPage';
import SAEBV2SimuladosPage from './pages/SAEBV2SimuladosPage';
import SAEBV2GerenciarQuestoesPage from './pages/SAEBV2GerenciarQuestoesPage';
import SAEBV2ProfessorPage from './pages/SAEBV2ProfessorPage';
import SAEBV2AlunoLoginPage from './pages/SAEBV2AlunoLoginPage';
import SAEBV2AlunoListPage from './pages/SAEBV2AlunoListPage';
import SAEBV2AlunoSimuladoPage from './pages/SAEBV2AlunoSimuladoPage';
import SAEBV2ResultadosPage from './pages/SAEBV2ResultadosPage';
import SAEBV2RelatoriosPage from './pages/SAEBV2RelatoriosPage';
import SAEBV2ConfiguracoesPage from './pages/SAEBV2ConfiguracoesPage';
import SAEBV2LancamentoManualPage from './pages/SAEBV2LancamentoManualPage';
import SAEBV2AnalisePsicometricaPage from './pages/SAEBV2AnalisePsicometricaPage';
import SAEBV2DashboardPage from './pages/SAEBV2DashboardPage';

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
        path="/"
        element={
          <AuthenticatedRoute>
            <DashboardNew />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/dashboard-old"
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
          <ProtectedRoute
            allowedProfiles={[
              PerfilUsuario.GESTAO_MUNICIPAL,
              PerfilUsuario.DIRETOR_COORDENADOR
            ]}
          >
            <TurmasAlunosPage />
          </ProtectedRoute>
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

      {/* SAEB V2 Routes */}
      {/* Public route for student token login */}
      <Route path="/saeb-acesso" element={<SAEBV2AlunoLoginPage />} />

      {/* Base SAEB V2 route - redirects to dashboard */}
      <Route
        path="/saeb-v2"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL, PerfilUsuario.DIRETOR_COORDENADOR]}>
            <Navigate to="/saeb-v2/dashboard" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/saeb-v2/configuracoes"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <SAEBV2ConfiguracoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/descritores"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <SAEBV2DescritoresPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/simulados"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <SAEBV2SimuladosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/simulados/:simuladoId/questoes"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <SAEBV2GerenciarQuestoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/professor"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.PROFESSOR]}>
            <SAEBV2ProfessorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/lancamento-manual"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.PROFESSOR]}>
            <SAEBV2LancamentoManualPage />
          </ProtectedRoute>
        }
      />
      {/* Student routes - authenticated by token, not by profile */}
      <Route
        path="/saeb-v2/aluno"
        element={
          <AuthenticatedRoute>
            <SAEBV2AlunoListPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/saeb-v2/aluno/simulado/:simuladoId"
        element={
          <AuthenticatedRoute>
            <SAEBV2AlunoSimuladoPage />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/saeb-v2/resultados/:turmaId/:simuladoId"
        element={
          <ProtectedRoute
            allowedProfiles={[
              PerfilUsuario.GESTAO_MUNICIPAL,
              PerfilUsuario.DIRETOR_COORDENADOR,
              PerfilUsuario.PROFESSOR
            ]}
          >
            <SAEBV2ResultadosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/relatorios"
        element={
          <ProtectedRoute
            allowedProfiles={[
              PerfilUsuario.GESTAO_MUNICIPAL,
              PerfilUsuario.DIRETOR_COORDENADOR,
              PerfilUsuario.PROFESSOR
            ]}
          >
            <SAEBV2RelatoriosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/dashboard"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <SAEBV2DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saeb-v2/simulados/:simuladoId/analise"
        element={
          <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
            <SAEBV2AnalisePsicometricaPage />
          </ProtectedRoute>
        }
      />

      {/* Redirect /dashboard to / for backward compatibility */}
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
