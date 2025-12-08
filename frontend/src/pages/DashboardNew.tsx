import React, { useEffect, useState } from 'react';
import { Box, Container } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { PerfilUsuario } from '../types';
import MainLayout from '../components/layout/MainLayout';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import DashboardStats from '../components/dashboard/DashboardStats';
import QuickActions from '../components/dashboard/QuickActions';
import api from '../services/api';

interface DashboardData {
  total_escolas?: number;
  total_alunos?: number;
  total_professores?: number;
  total_turmas?: number;
  media_saeb?: number;
  taxa_aprovacao?: number;
  mensagens_nao_lidas?: number;
  avaliacoes_pendentes?: number;
}

const DashboardNew: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Aqui você pode buscar dados específicos do backend
      // Por enquanto, vamos usar dados mockados
      setData({
        total_escolas: 12,
        total_alunos: 1234,
        total_professores: 89,
        total_turmas: 56,
        media_saeb: 7.8,
        taxa_aprovacao: 92,
        mensagens_nao_lidas: 3,
        avaliacoes_pendentes: 2,
      });
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setLoading(false);
    }
  };

  if (!user) return null;

  // Configurações específicas por perfil
  const getDashboardConfig = () => {
    switch (user.perfil) {
      case PerfilUsuario.GESTAO_MUNICIPAL:
        return {
          subtitle: 'Visão completa da rede municipal de educação',
          stats: [
            {
              label: 'Total de Escolas',
              value: data.total_escolas || 0,
              trend: { value: '2 novas este ano', direction: 'up' as const },
              color: 'primary' as const,
            },
            {
              label: 'Alunos Matriculados',
              value: data.total_alunos || 0,
              trend: { value: '+5% vs ano anterior', direction: 'up' as const },
              color: 'success' as const,
            },
            {
              label: 'Professores',
              value: data.total_professores || 0,
              trend: { value: 'Estável', direction: 'neutral' as const },
              color: 'warning' as const,
            },
            {
              label: 'Média SAEB Rede',
              value: data.media_saeb || 0,
              trend: { value: '+0.4 pontos', direction: 'up' as const },
              color: 'error' as const,
            },
          ],
          actions: [
            { icon: '📊', label: 'Relatórios', path: '/relatorios' },
            { icon: '🏫', label: 'Escolas', path: '/escolas' },
            { icon: '📝', label: 'SAEB', path: '/saeb-v2/dashboard' },
            { icon: '📈', label: 'Diagnósticos', path: '/diagnosticos' },
            { icon: '⚙️', label: 'Configurações', path: '/configuracoes-grafico' },
            { icon: '💬', label: 'Mensagens', path: '/mensagens' },
          ],
        };

      case PerfilUsuario.DIRETOR_COORDENADOR:
        return {
          subtitle: 'Gestão da sua escola e acompanhamento pedagógico',
          stats: [
            {
              label: 'Turmas Ativas',
              value: data.total_turmas || 0,
              color: 'primary' as const,
            },
            {
              label: 'Alunos',
              value: data.total_alunos || 0,
              color: 'success' as const,
            },
            {
              label: 'Professores',
              value: data.total_professores || 0,
              color: 'warning' as const,
            },
            {
              label: 'Taxa Aprovação',
              value: `${data.taxa_aprovacao || 0}%`,
              trend: { value: '+3% vs bimestre anterior', direction: 'up' as const },
              color: 'error' as const,
            },
          ],
          actions: [
            { icon: '👨‍🏫', label: 'Professores', path: '/professores' },
            { icon: '🎓', label: 'Turmas', path: '/turmas' },
            { icon: '📊', label: 'Relatórios', path: '/relatorios' },
            { icon: '📝', label: 'Avaliações', path: '/avaliacoes' },
            { icon: '📈', label: 'Diagnósticos', path: '/diagnosticos' },
          ],
        };

      case PerfilUsuario.PROFESSOR:
        return {
          subtitle: 'Gerencie suas turmas e avaliações',
          stats: [
            {
              label: 'Minhas Turmas',
              value: 3,
              color: 'primary' as const,
            },
            {
              label: 'Total de Alunos',
              value: 87,
              color: 'success' as const,
            },
            {
              label: 'Avaliações Pendentes',
              value: data.avaliacoes_pendentes || 0,
              color: 'warning' as const,
            },
            {
              label: 'Mensagens Não Lidas',
              value: data.mensagens_nao_lidas || 0,
              color: 'error' as const,
            },
          ],
          actions: [
            { icon: '📝', label: 'Aplicar Diagnóstico', path: '/diagnostico-avaliar' },
            { icon: '📊', label: 'SAEB Simulados', path: '/saeb-v2/professor' },
            { icon: '✍️', label: 'Lançar Notas', path: '/saeb-v2/lancamento-manual' },
            { icon: '📈', label: 'Relatórios', path: '/relatorios' },
            { icon: '💬', label: 'Mensagens', path: '/mensagens' },
          ],
        };

      case PerfilUsuario.COMUNIDADE:
        return {
          subtitle: 'Acompanhe os relatórios e métricas educacionais',
          stats: [
            {
              label: 'Escolas Municipais',
              value: data.total_escolas || 0,
              color: 'primary' as const,
            },
            {
              label: 'Alunos Atendidos',
              value: data.total_alunos || 0,
              color: 'success' as const,
            },
            {
              label: 'Taxa de Aprovação',
              value: `${data.taxa_aprovacao || 0}%`,
              color: 'warning' as const,
            },
          ],
          actions: [
            { icon: '📊', label: 'Relatórios Públicos', path: '/relatorios' },
            { icon: '📈', label: 'Indicadores', path: '/relatorios' },
          ],
        };

      default:
        return {
          subtitle: 'Sistema Modular de Gestão Educacional',
          stats: [],
          actions: [],
        };
    }
  };

  const config = getDashboardConfig();

  return (
    <MainLayout title="Dashboard">
      <Box sx={{ width: '100%', height: '100%' }}>
        <WelcomeCard
          userName={user.nome_completo.split(' ')[0]}
          subtitle={config.subtitle}
        />

        <Box sx={{ mb: 4 }}>
          <DashboardStats stats={config.stats} />
        </Box>

        <QuickActions actions={config.actions} />
      </Box>
    </MainLayout>
  );
};

export default DashboardNew;