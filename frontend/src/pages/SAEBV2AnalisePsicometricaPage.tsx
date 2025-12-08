/**
 * SAEB V2 - Análise Psicométrica
 * Exibe análise completa de um simulado com métricas psicométricas
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ExpandMore as ExpandIcon,
  TrendingUp as TrendingIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import { AnalisePsicometricaSimulado } from '../types';

const SAEBV2AnalisePsicometricaPage: React.FC = () => {
  const { simuladoId } = useParams<{ simuladoId: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [analise, setAnalise] = useState<AnalisePsicometricaSimulado | null>(null);

  useEffect(() => {
    if (simuladoId) {
      loadAnalise();
    }
  }, [simuladoId]);

  const loadAnalise = async () => {
    try {
      setLoading(true);
      const response = await saebV2API.analisePsicometricaSimulado(Number(simuladoId));
      setAnalise(response.data);
    } catch (error: any) {
      const mensagem = error.response?.data?.detail || 'Erro ao carregar análise';
      showNotification(mensagem, 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getClassificacaoColor = (classificacao: string) => {
    if (classificacao.includes('Excelente') || classificacao.includes('Bom')) return 'success';
    if (classificacao.includes('Regular') || classificacao.includes('Aceitável')) return 'info';
    if (classificacao.includes('Fraco') || classificacao.includes('Questionável')) return 'warning';
    return 'error';
  };

  const getDificuldadeColor = (classificacao: string) => {
    if (classificacao === 'Muito fácil') return 'success';
    if (classificacao === 'Fácil') return 'info';
    if (classificacao === 'Médio') return 'default';
    if (classificacao === 'Difícil') return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <MainLayout title="Análise Psicométrica">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!analise) {
    return (
      <MainLayout title="Análise Psicométrica">
        <Box sx={{ width: '100%', height: '100%' }}>
          <Alert severity="error">Erro ao carregar análise psicométrica</Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Análise Psicométrica - ${analise.simulado_nome}`}>
      <Box sx={{ width: '100%', height: '100%' }}>
        {/* Header Actions */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/saeb-v2/simulados')}
          >
            Voltar para Simulados
          </Button>
        </Box>

        {/* Estatísticas Gerais */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon color="primary" />
            Estatísticas Gerais
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {analise.total_participantes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Participantes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="success.main">
                    {analise.media_geral.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Média Geral
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="info.main">
                    {analise.mediana.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mediana
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="warning.main">
                    {analise.desvio_padrao.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Desvio Padrão
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nota Mínima
                  </Typography>
                  <Typography variant="h5" color="success.dark">
                    {analise.nota_minima.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nota Máxima
                  </Typography>
                  <Typography variant="h5" color="error.dark">
                    {analise.nota_maxima.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Alpha de Cronbach */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon color="primary" />
            Confiabilidade do Teste
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" color="primary.main">
                  {analise.alpha_cronbach.toFixed(3)}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Coeficiente Alpha de Cronbach
                </Typography>
                <Chip
                  label={analise.classificacao_alpha}
                  color={getClassificacaoColor(analise.classificacao_alpha)}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Alert severity="info">
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Interpretação:
                </Typography>
                <Typography variant="body2">
                  O Alpha de Cronbach mede a consistência interna do teste. Valores acima de 0.70 indicam que o teste é confiável e as questões avaliam de forma consistente as habilidades dos alunos.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Paper>

        {/* Análise por Disciplina */}
        {(analise.analise_portugues || analise.analise_matematica) && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Análise por Disciplina
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {analise.analise_portugues && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="info.main" gutterBottom>
                        Português
                      </Typography>
                      <Typography variant="h4">
                        {analise.analise_portugues.media.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Média de Acertos ({analise.analise_portugues.total_questoes} questões)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {analise.analise_matematica && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="warning.main" gutterBottom>
                        Matemática
                      </Typography>
                      <Typography variant="h4">
                        {analise.analise_matematica.media.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Média de Acertos ({analise.analise_matematica.total_questoes} questões)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Análise das Questões */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Análise Detalhada das Questões
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Quest ão</TableCell>
                  <TableCell>Descritor</TableCell>
                  <TableCell align="center">Respostas</TableCell>
                  <TableCell align="center">Acertos</TableCell>
                  <TableCell>Dificuldade</TableCell>
                  <TableCell>Discriminação</TableCell>
                  <TableCell align="center">Distratores</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analise.questoes.map((q, index) => (
                  <TableRow key={q.questao_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        Q{index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{q.descritor_codigo}</Typography>
                    </TableCell>
                    <TableCell align="center">{q.total_respostas}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        {q.total_acertos}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {q.indice_dificuldade.toFixed(1)}%
                        </Typography>
                        <Chip
                          label={q.classificacao_dificuldade}
                          size="small"
                          color={getDificuldadeColor(q.classificacao_dificuldade)}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {q.indice_discriminacao.toFixed(2)}
                        </Typography>
                        <Chip
                          label={q.classificacao_discriminacao}
                          size="small"
                          color={getClassificacaoColor(q.classificacao_discriminacao)}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${q.distratores_eficazes.length}/4`}
                        size="small"
                        color={q.distratores_eficazes.length >= 3 ? 'success' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Análise por Descritor */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Análise por Descritor
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {analise.descritores.map((desc) => (
            <Accordion key={desc.descritor_id}>
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {desc.descritor_codigo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    {desc.total_questoes} questão(ões)
                  </Typography>
                  <Chip
                    label={`${desc.media_dificuldade.toFixed(1)}% acertos`}
                    size="small"
                    color="primary"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {desc.descritor_descricao}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Média de Dificuldade
                    </Typography>
                    <Typography variant="h6">{desc.media_dificuldade.toFixed(1)}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Média de Discriminação
                    </Typography>
                    <Typography variant="h6">{desc.media_discriminacao.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default SAEBV2AnalisePsicometricaPage;
