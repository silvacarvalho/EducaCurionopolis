/**
 * SAEB V2 - Dashboard de Métricas
 * Dashboard consolidado com métricas da rede municipal
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  CheckCircle as CheckIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import { DashboardMetricas } from '../types';

const SAEBV2DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());

  useEffect(() => {
    loadMetricas();
  }, [anoLetivo]);

  const loadMetricas = async () => {
    try {
      setLoading(true);
      const response = await saebV2API.dashboardMetricas(anoLetivo);
      setMetricas(response.data);
    } catch (error: any) {
      const mensagem = error.response?.data?.detail || 'Erro ao carregar métricas';
      showNotification(mensagem, 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <AppBarWithUserMenu title="Dashboard SAEB" showBackButton />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!metricas) {
    return (
      <Box>
        <AppBarWithUserMenu title="Dashboard SAEB" showBackButton />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">Erro ao carregar métricas</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppBarWithUserMenu title="Dashboard SAEB - Métricas da Rede" showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Filtro de Ano Letivo */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">{metricas.periodo}</Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Ano Letivo</InputLabel>
            <Select
              value={anoLetivo}
              label="Ano Letivo"
              onChange={(e) => setAnoLetivo(e.target.value as number)}
            >
              {[2024, 2025, 2026].map((ano) => (
                <MenuItem key={ano} value={ano}>
                  {ano}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Métricas Principais */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'primary.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h3" color="primary.dark">
                  {metricas.total_simulados}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Simulados Aplicados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'success.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="h3" color="success.dark">
                  {metricas.total_alunos_unicos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Alunos Participantes
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'info.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                <Typography variant="h3" color="info.dark">
                  {metricas.total_participacoes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Participações
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'warning.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                <Typography variant="h3" color="warning.dark">
                  {metricas.taxa_conclusao.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Taxa de Conclusão
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Média da Rede */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon color="primary" />
            Desempenho da Rede
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h2" color="primary.main">
              {metricas.media_geral_rede.toFixed(1)}%
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Média Geral da Rede Municipal
            </Typography>
          </Box>

          {(metricas.melhor_escola || metricas.pior_escola) && (
            <Grid container spacing={3}>
              {metricas.melhor_escola && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TrophyIcon color="success" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Melhor Desempenho
                        </Typography>
                      </Box>
                      <Typography variant="h6">{metricas.melhor_escola.nome}</Typography>
                      <Typography variant="h4" color="success.dark">
                        {metricas.melhor_escola.media.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {metricas.pior_escola && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ bgcolor: 'warning.light' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SchoolIcon color="warning" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Necessita Atenção
                        </Typography>
                      </Box>
                      <Typography variant="h6">{metricas.pior_escola.nome}</Typography>
                      <Typography variant="h4" color="warning.dark">
                        {metricas.pior_escola.media.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Paper>

        {/* Análise de Dificuldade das Questões */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Distribuição de Dificuldade das Questões
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Muito Fácil" color="success" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="success.main">
                    {metricas.questoes_muito_faceis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Fácil" color="info" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="info.main">
                    {metricas.questoes_faceis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Médio" color="default" sx={{ mb: 1 }} />
                  <Typography variant="h4">
                    {metricas.questoes_medias}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Difícil" color="warning" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="warning.main">
                    {metricas.questoes_dificeis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Muito Difícil" color="error" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="error.main">
                    {metricas.questoes_muito_dificeis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              Uma boa distribuição de dificuldade deve ter mais questões de nível médio, com questões fáceis e difíceis equilibradas nas extremidades.
            </Typography>
          </Alert>
        </Paper>

        {/* Evolução Mensal */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Evolução nos Últimos 6 Meses
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            {metricas.evolucao_mensal.map((mes) => (
              <Grid item xs={12} sm={6} md={2} key={mes.mes}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {mes.mes}
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      {mes.media.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mes.total_participacoes} participações
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default SAEBV2DashboardPage;
