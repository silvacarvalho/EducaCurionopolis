/**
 * Dashboard Analytics - EDUCA+ Curionópolis
 * Painel principal com métricas gerais do sistema educacional
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Skeleton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Collapse,
  ListItemButton,
  CircularProgress,
} from '@mui/material';
import {
  School,
  Person,
  Class,
  Groups,
  Assessment,
  Psychology,
  Warning,
  TrendingDown,
  Schedule,
  CheckCircle,
  Refresh,
  ArrowForward,
  EmojiEvents,
  Analytics,
  Quiz,
  Mail,
  Grading,
  ExpandLess,
  ExpandMore,
  Close,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { PerfilUsuario } from '../types';

// Tipos
interface DashboardStats {
  ano_letivo: number;
  atualizado_em: string;
  contadores: {
    escolas: number;
    professores: number;
    turmas: number;
    alunos: number;
    avaliacoes: number;
    diagnosticos: number;
  };
  saeb: {
    simulados: number;
    participantes: number;
    participacoes: number;
    taxa_conclusao: number;
    media_rede: number;
  };
  hipoteses_escrita: {
    pre_silabico: number;
    silabico_sem_valor_sonoro: number;
    silabico_com_valor_sonoro: number;
    silabico_alfabetico: number;
    alfabetico: number;
    nao_avaliado: number;
  };
  alertas: Array<{
    tipo: 'danger' | 'warning' | 'info' | 'success';
    titulo: string;
    descricao: string;
    icone: string;
    link?: string;
    modal?: string;
    acao?: string;
  }>;
  desempenho_bimestre: Array<{
    bimestre: number;
    label: string;
    media: number;
  }>;
  top_escolas: Array<{
    id: number;
    nome: string;
    turmas: number;
    alunos: number;
    media_saeb: number;
  }>;
}

// Cores para hipóteses de escrita
const HIPOTESE_COLORS = {
  pre_silabico: { bg: '#fee2e2', text: '#dc2626', label: 'Pré-Silábico' },
  silabico_sem_valor_sonoro: { bg: '#ffedd5', text: '#ea580c', label: 'Silábico s/ Valor' },
  silabico_com_valor_sonoro: { bg: '#fef9c3', text: '#ca8a04', label: 'Silábico c/ Valor' },
  silabico_alfabetico: { bg: '#dcfce7', text: '#16a34a', label: 'Silábico-Alfabético' },
  alfabetico: { bg: '#dbeafe', text: '#1d4ed8', label: 'Alfabético' },
};

// Componente de Card de Métrica
const MetricCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  trend?: string;
  onClick?: () => void;
}> = ({ icon, value, label, color, trend, onClick }) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      '&:hover': onClick ? {
        transform: 'translateY(-2px)',
        boxShadow: 4,
      } : {},
    }}
    onClick={onClick}
  >
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 3,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" fontWeight="bold">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {trend && (
          <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircle sx={{ fontSize: 14 }} />
            {trend}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

// Componente de Alerta com suporte a navegação e modal
const AlertItem: React.FC<{
  tipo: 'danger' | 'warning' | 'info' | 'success';
  titulo: string;
  descricao: string;
  icone: string;
  link?: string;
  modal?: string;
  acao?: string;
  onNavigate?: (link: string) => void;
  onOpenModal?: (modalType: string) => void;
}> = ({ tipo, titulo, descricao, icone, link, modal, acao, onNavigate, onOpenModal }) => {
  const colors = {
    danger: { bg: '#fef2f2', border: '#ef4444', icon: '#ef4444' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: '#f59e0b' },
    info: { bg: '#eff6ff', border: '#3b82f6', icon: '#3b82f6' },
    success: { bg: '#f0fdf4', border: '#22c55e', icon: '#22c55e' },
  };

  const getIcon = () => {
    switch (icone) {
      case 'warning': return <Warning />;
      case 'trending_down': return <TrendingDown />;
      case 'schedule': return <Schedule />;
      case 'check_circle': return <CheckCircle />;
      default: return <Warning />;
    }
  };

  const handleClick = () => {
    if (modal && onOpenModal) {
      onOpenModal(modal);
    } else if (link && onNavigate) {
      onNavigate(link);
    }
  };

  const isClickable = link || modal;

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 2,
        mb: 1.5,
        borderRadius: 2,
        bgcolor: colors[tipo].bg,
        borderLeft: `4px solid ${colors[tipo].border}`,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': isClickable ? {
          transform: 'translateX(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        } : {},
      }}
    >
      <Box sx={{ color: colors[tipo].icon, mt: 0.25 }}>{getIcon()}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" fontWeight="600">
          {titulo}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {descricao}
        </Typography>
        {isClickable && acao && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              mt: 0.5, 
              color: colors[tipo].icon,
              fontWeight: 600,
            }}
          >
            {acao} →
          </Typography>
        )}
      </Box>
      {isClickable && (
        <Box sx={{ color: colors[tipo].icon, opacity: 0.5 }}>
          <ArrowForward fontSize="small" />
        </Box>
      )}
    </Box>
  );
};

// Componente Principal
const DashboardAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [tabValue, setTabValue] = useState(0);
  
  // Estados dos modais de alertas
  const [modalTurmasSemProfessor, setModalTurmasSemProfessor] = useState(false);
  const [modalAlunosSemDiagnostico, setModalAlunosSemDiagnostico] = useState(false);
  const [modalEscolasBaixoSaeb, setModalEscolasBaixoSaeb] = useState(false);
  const [dataTurmasSemProfessor, setDataTurmasSemProfessor] = useState<any>(null);
  const [dataAlunosSemDiagnostico, setDataAlunosSemDiagnostico] = useState<any>(null);
  const [dataEscolasBaixoSaeb, setDataEscolasBaixoSaeb] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, [anoLetivo]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await dashboardAPI.getStats(anoLetivo);
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir modais de alerta
  const handleOpenAlertModal = async (modalType: string) => {
    setModalLoading(true);
    setModalError(null);
    try {
      let response;
      switch (modalType) {
        case 'turmas-sem-professor':
          setModalTurmasSemProfessor(true);
          response = await dashboardAPI.getTurmasSemProfessor(anoLetivo);
          setDataTurmasSemProfessor(response.data);
          break;
        case 'alunos-sem-diagnostico':
          setModalAlunosSemDiagnostico(true);
          response = await dashboardAPI.getAlunosSemDiagnostico(anoLetivo);
          setDataAlunosSemDiagnostico(response.data);
          break;
        case 'escolas-baixo-saeb':
          setModalEscolasBaixoSaeb(true);
          response = await dashboardAPI.getEscolasBaixoSaeb(anoLetivo);
          setDataEscolasBaixoSaeb(response.data);
          break;
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do modal:', err);
      setModalError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setModalLoading(false);
    }
  };

  // Dados para gráfico de hipóteses
  const hipotesesChartData = stats ? [
    { name: 'Pré-Silábico', value: stats.hipoteses_escrita.pre_silabico, color: '#dc2626' },
    { name: 'Silábico s/ Valor', value: stats.hipoteses_escrita.silabico_sem_valor_sonoro, color: '#ea580c' },
    { name: 'Silábico c/ Valor', value: stats.hipoteses_escrita.silabico_com_valor_sonoro, color: '#ca8a04' },
    { name: 'Silábico-Alfabético', value: stats.hipoteses_escrita.silabico_alfabetico, color: '#16a34a' },
    { name: 'Alfabético', value: stats.hipoteses_escrita.alfabetico, color: '#1d4ed8' },
  ] : [];

  // Ações rápidas baseadas no perfil
  const quickActions: Array<{
    title: string;
    desc: string;
    icon: React.ReactNode;
    path: string;
    color: string;
    roles?: PerfilUsuario[];
  }> = [
    { title: 'Relatórios', desc: 'Visualizar métricas', icon: <Analytics />, path: '/relatorios', color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    { title: 'Escolas', desc: 'Gerenciar escolas', icon: <School />, path: '/escolas', color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', roles: [PerfilUsuario.GESTAO_MUNICIPAL] },
    { title: 'Diagnósticos', desc: 'Aplicar e visualizar', icon: <Psychology />, path: '/diagnosticos', color: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { title: 'SAEB', desc: 'Simulados', icon: <Quiz />, path: '/saeb-v2/simulados', color: 'linear-gradient(135deg, #f97316, #ea580c)' },
    { title: 'Avaliações', desc: 'Lançar notas', icon: <Grading />, path: '/avaliacoes', color: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    { title: 'Mensagens', desc: 'Comunicação', icon: <Mail />, path: '/mensagens', color: 'linear-gradient(135deg, #ef4444, #dc2626)' },
  ];

  // Chip do Ano Letivo para o header
  const anoLetivoChip = (
    <Chip
      icon={<Schedule sx={{ fontSize: 16 }} />}
      label={`Ano Letivo ${anoLetivo}`}
      color="primary"
      variant="outlined"
      size="small"
    />
  );

  if (loading && !stats) {
    return (
      <MainLayout title="Dashboard Analytics" headerExtra={anoLetivoChip}>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
                <Skeleton variant="rounded" height={120} />
              </Grid>
            ))}
          </Grid>
          <Skeleton variant="rounded" height={200} sx={{ mt: 3 }} />
          <Skeleton variant="rounded" height={300} sx={{ mt: 3 }} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard Analytics" headerExtra={anoLetivoChip}>
      <Box sx={{ width: '100%' }}>
        {/* Filtros */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3, gap: 2 }}>
          <FormControl size="small">
            <Select
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(e.target.value as number)}
            >
              <MenuItem value={2025}>2025</MenuItem>
              <MenuItem value={2024}>2024</MenuItem>
              <MenuItem value={2023}>2023</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadDashboardStats} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabs de navegação */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Visão Geral" />
            <Tab label="Por Escola" />
          </Tabs>
        </Paper>

        {tabValue === 0 && stats && (
          <>
            {/* Métricas Principais - Linha 1 */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  icon={<School sx={{ fontSize: 28 }} />}
                  value={stats.contadores.escolas}
                  label="Escolas Ativas"
                  color="linear-gradient(135deg, #3b82f6, #1d4ed8)"
                  onClick={() => navigate('/escolas')}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  icon={<Person sx={{ fontSize: 28 }} />}
                  value={stats.contadores.professores}
                  label="Professores"
                  color="linear-gradient(135deg, #8b5cf6, #7c3aed)"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  icon={<Class sx={{ fontSize: 28 }} />}
                  value={stats.contadores.turmas}
                  label="Turmas"
                  color="linear-gradient(135deg, #f97316, #ea580c)"
                  onClick={() => navigate('/turmas')}
                />
              </Grid>
            </Grid>

            {/* Métricas Principais - Linha 2 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  icon={<Groups sx={{ fontSize: 28 }} />}
                  value={stats.contadores.alunos}
                  label="Alunos"
                  color="linear-gradient(135deg, #22c55e, #16a34a)"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  icon={<Assessment sx={{ fontSize: 28 }} />}
                  value={stats.contadores.avaliacoes}
                  label="Avaliações"
                  color="linear-gradient(135deg, #ef4444, #dc2626)"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MetricCard
                  icon={<Psychology sx={{ fontSize: 28 }} />}
                  value={stats.contadores.diagnosticos}
                  label="Diagnósticos"
                  color="linear-gradient(135deg, #06b6d4, #0891b2)"
                  onClick={() => navigate('/diagnosticos')}
                />
              </Grid>
            </Grid>

            {/* Seção SAEB */}
            <Paper
              sx={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                p: 3,
                mb: 3,
                borderRadius: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <EmojiEvents sx={{ color: '#1e40af' }} />
                <Typography variant="h6" fontWeight="600" color="#1e40af">
                  Métricas SAEB - Rede Municipal
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {[
                  { value: stats.saeb.simulados, label: 'Simulados' },
                  { value: stats.saeb.participantes, label: 'Participantes' },
                  { value: stats.saeb.participacoes, label: 'Participações' },
                  { value: `${stats.saeb.taxa_conclusao}%`, label: 'Taxa Conclusão' },
                  { value: `${stats.saeb.media_rede}%`, label: 'Média Rede' },
                ].map((item, idx) => (
                  <Grid item xs={6} sm={4} md={2.4} key={idx}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight="bold" color="#1e40af">
                        {typeof item.value === 'number' ? item.value.toLocaleString('pt-BR') : item.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {item.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Grid de Gráficos e Alertas */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Gráfico de Bimestre */}
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assessment color="primary" />
                    Desempenho por Bimestre
                  </Typography>
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.desempenho_bimestre}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip formatter={(value) => [`${value}`, 'Média']} />
                        <Bar dataKey="media" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              {/* Alertas */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" />
                    Alertas
                  </Typography>
                  {stats.alertas.length > 0 ? (
                    stats.alertas.map((alerta, idx) => (
                      <AlertItem 
                        key={idx} 
                        {...alerta} 
                        onNavigate={navigate} 
                        onOpenModal={handleOpenAlertModal}
                      />
                    ))
                  ) : (
                    <Alert severity="success">
                      Nenhum alerta no momento. Tudo em ordem!
                    </Alert>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Diagnósticos - Hipóteses de Escrita */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology color="info" />
                Diagnóstico de Escrita - Hipóteses (1º ao 5º Ano)
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(HIPOTESE_COLORS).map(([key, config]) => (
                  <Grid item xs={6} sm={4} md={2.4} key={key}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        borderRadius: 2,
                        bgcolor: config.bg,
                      }}
                    >
                      <Typography variant="h4" fontWeight="bold" color={config.text}>
                        {stats.hipoteses_escrita[key as keyof typeof stats.hipoteses_escrita] || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Ações Rápidas */}
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowForward color="primary" />
              Ações Rápidas
            </Typography>
            <Grid container spacing={2}>
              {quickActions
                .filter((action) => !action.roles || hasRole(action.roles))
                .map((action, idx) => (
                  <Grid item xs={6} sm={4} md={2} key={idx}>
                    <Card
                      sx={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: 4,
                        },
                      }}
                      onClick={() => navigate(action.path)}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 3,
                            background: action.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px',
                            color: 'white',
                          }}
                        >
                          {action.icon}
                        </Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          {action.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.desc}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </>
        )}

        {tabValue === 1 && stats && (
          <>
            {/* Tabela de Escolas */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <School color="primary" />
                Desempenho por Escola
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Escola</TableCell>
                      <TableCell align="center">Turmas</TableCell>
                      <TableCell align="center">Alunos</TableCell>
                      <TableCell align="center">Média SAEB</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.top_escolas.map((escola) => (
                      <TableRow
                        key={escola.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/escolas`)}
                      >
                        <TableCell>
                          <Typography fontWeight="600">{escola.nome}</Typography>
                        </TableCell>
                        <TableCell align="center">{escola.turmas}</TableCell>
                        <TableCell align="center">{escola.alunos}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Box sx={{ width: 80 }}>
                              <LinearProgress
                                variant="determinate"
                                value={escola.media_saeb}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: '#e2e8f0',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: escola.media_saeb >= 70 ? '#22c55e' : escola.media_saeb >= 50 ? '#f97316' : '#ef4444',
                                    borderRadius: 4,
                                  },
                                }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="500">
                              {escola.media_saeb}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={escola.media_saeb >= 70 ? 'Bom' : escola.media_saeb >= 50 ? 'Regular' : 'Atenção'}
                            size="small"
                            color={escola.media_saeb >= 70 ? 'success' : escola.media_saeb >= 50 ? 'warning' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {stats.top_escolas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">
                            Nenhuma escola encontrada para o ano letivo selecionado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Box>

      {/* Modal: Turmas sem Professor */}
      <Dialog 
        open={modalTurmasSemProfessor} 
        onClose={() => setModalTurmasSemProfessor(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            Turmas sem Professor Atribuído
          </Box>
          <IconButton onClick={() => setModalTurmasSemProfessor(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {modalLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : modalError ? (
            <Alert severity="error">{modalError}</Alert>
          ) : dataTurmasSemProfessor?.escolas?.length > 0 ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {dataTurmasSemProfessor.total} turma(s) sem professor atribuído
              </Alert>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Escola</strong></TableCell>
                      <TableCell><strong>Turma</strong></TableCell>
                      <TableCell><strong>Série/Ano</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataTurmasSemProfessor.escolas.map((escola: any) => (
                      escola.turmas.map((turma: any, idx: number) => (
                        <TableRow key={turma.id} hover>
                          <TableCell>
                            {idx === 0 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <School fontSize="small" color="primary" />
                                {escola.escola_nome}
                              </Box>
                            ) : ''}
                          </TableCell>
                          <TableCell>{turma.nome}</TableCell>
                          <TableCell>{turma.serie_ano}</TableCell>
                          <TableCell align="center">
                            <Chip label="Sem professor" size="small" color="error" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Alert severity="success">Todas as turmas possuem professor atribuído!</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalTurmasSemProfessor(false)}>Fechar</Button>
          <Button variant="contained" onClick={() => { setModalTurmasSemProfessor(false); navigate('/escolas'); }}>
            Gerenciar Escolas
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Alunos sem Diagnóstico */}
      <Dialog 
        open={modalAlunosSemDiagnostico} 
        onClose={() => setModalAlunosSemDiagnostico(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule color="info" />
            Diagnósticos Pendentes
          </Box>
          <IconButton onClick={() => setModalAlunosSemDiagnostico(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {modalLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : modalError ? (
            <Alert severity="error">{modalError}</Alert>
          ) : dataAlunosSemDiagnostico?.escolas?.length > 0 ? (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Total de <strong>{dataAlunosSemDiagnostico.total}</strong> aluno(s) aguardando diagnóstico
              </Alert>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Escola</strong></TableCell>
                      <TableCell><strong>Turma</strong></TableCell>
                      <TableCell><strong>Série/Ano</strong></TableCell>
                      <TableCell align="center"><strong>Alunos Pendentes</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataAlunosSemDiagnostico.escolas.map((escola: any) => {
                      let escolaRowSpan = escola.turmas.length;
                      return escola.turmas.map((turma: any, idx: number) => (
                        <TableRow key={`${escola.escola_id}-${turma.turma_id}`} hover>
                          {idx === 0 && (
                            <TableCell rowSpan={escolaRowSpan}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <School fontSize="small" color="primary" />
                                {escola.escola_nome}
                              </Box>
                            </TableCell>
                          )}
                          <TableCell>{turma.turma_nome}</TableCell>
                          <TableCell>{turma.ano_escolar}º Ano</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${turma.alunos.length} aluno(s)`} 
                              size="small" 
                              color={turma.alunos.length > 10 ? 'error' : turma.alunos.length > 5 ? 'warning' : 'info'}
                            />
                          </TableCell>
                        </TableRow>
                      ));
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Alert severity="success">Todos os alunos já foram avaliados!</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAlunosSemDiagnostico(false)}>Fechar</Button>
          <Button variant="contained" onClick={() => { setModalAlunosSemDiagnostico(false); navigate('/diagnostico-avaliar'); }}>
            Aplicar Diagnóstico
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Escolas Abaixo do SAEB */}
      <Dialog 
        open={modalEscolasBaixoSaeb} 
        onClose={() => setModalEscolasBaixoSaeb(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDown color="warning" />
            Escolas Abaixo da Média SAEB
          </Box>
          <IconButton onClick={() => setModalEscolasBaixoSaeb(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {modalLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : modalError ? (
            <Alert severity="error">{modalError}</Alert>
          ) : dataEscolasBaixoSaeb?.escolas?.length > 0 ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {dataEscolasBaixoSaeb.total} escola(s) com média SAEB inferior a 50%
              </Alert>
              <List>
                {dataEscolasBaixoSaeb.escolas.map((escola: any) => (
                  <ListItem key={escola.id} divider>
                    <ListItemText 
                      primary={escola.nome}
                      secondary={`${escola.total_alunos} alunos avaliados`}
                    />
                    <Chip 
                      label={`${escola.media_saeb}%`} 
                      color="error" 
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Alert severity="success">Todas as escolas estão com média SAEB adequada!</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEscolasBaixoSaeb(false)}>Fechar</Button>
          <Button variant="contained" onClick={() => { setModalEscolasBaixoSaeb(false); navigate('/saeb-v2/dashboard'); }}>
            Ver Dashboard SAEB
          </Button>
        </DialogActions>
      </Dialog>

    </MainLayout>
  );
};

export default DashboardAnalytics;
