/**
 * SAEB V2 - Relatórios Page
 * Comprehensive reports with descriptor analysis and charts
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendingIcon,
  School as SchoolIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  MenuBook as MenuBookIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API, turmasAPI, escolasAPI } from '../services/api';
import {
  RelatorioSimulado,
  RelatorioDescritor,
  SimuladoSAEB,
  Turma,
  SituacaoSAEB,
  Escola,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const SAEBV2RelatoriosPage: React.FC = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Data
  const [simulados, setSimulados] = useState<SimuladoSAEB[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedSimuladoId, setSelectedSimuladoId] = useState<number>(0);
  const [selectedEscolaId, setSelectedEscolaId] = useState<number | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('');

  // Reports
  const [relatorioSimulado, setRelatorioSimulado] = useState<RelatorioSimulado | null>(null);
  const [relatorioDescritores, setRelatorioDescritores] = useState<RelatorioDescritor[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSimuladoId) {
      loadRelatorios();
    }
  }, [selectedSimuladoId, selectedEscolaId, selectedTurmaId, selectedDisciplina]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [simuladosResponse, escolasResponse, turmasResponse] = await Promise.all([
        saebV2API.listSimulados(),
        escolasAPI.list(),
        turmasAPI.list(),
      ]);

      setSimulados(simuladosResponse.data);
      setEscolas(escolasResponse.data);
      setTurmas(turmasResponse.data);
    } catch (error) {
      showNotification('Erro ao carregar dados iniciais', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRelatorios = async () => {
    if (!selectedSimuladoId) return;

    try {
      setLoading(true);

      const [relSimuladoResponse, relDescritoresResponse] = await Promise.all([
        saebV2API.getRelatorioSimulado(
          selectedSimuladoId, 
          selectedEscolaId || undefined,
          selectedTurmaId || undefined,
          selectedDisciplina || undefined
        ),
        saebV2API.getRelatorioDescritores(
          selectedSimuladoId, 
          selectedEscolaId || undefined,
          selectedTurmaId || undefined,
          selectedDisciplina || undefined
        ),
      ]);

      setRelatorioSimulado(relSimuladoResponse.data);
      setRelatorioDescritores(relDescritoresResponse.data);
    } catch (error: any) {
      showNotification(
        error.response?.data?.detail || 'Erro ao carregar relatórios',
        'error'
      );
      setRelatorioSimulado(null);
      setRelatorioDescritores([]);
    } finally {
      setLoading(false);
    }
  };

  const getSituacaoColor = (situacao: string) => {
    const situacaoLower = situacao.toLowerCase();
    switch (situacaoLower) {
      case 'adequado':
        return 'success';
      case 'intermediario_i':
      case 'intermediario_ii':
        return 'info';
      case 'critico':
        return 'warning';
      case 'muito_critico':
        return 'error';
      default:
        return 'default';
    }
  };

  const getDesempenhoColor = (porcentagem: number) => {
    if (porcentagem > 89) return 'success';
    if (porcentagem > 74) return 'info';
    if (porcentagem > 50) return 'warning';
    return 'error';
  };

  const selectedSimulado = simulados.find((s) => s.id === selectedSimuladoId);
  const selectedEscola = selectedEscolaId ? escolas.find((e) => e.id === selectedEscolaId) : null;
  const selectedTurma = selectedTurmaId ? turmas.find((t) => t.id === selectedTurmaId) : null;
  
  // Filtrar turmas por escola selecionada e apenas 5º/9º ano (anos do simulado SAEB)
  const turmasFiltradas = turmas.filter((t) => {
    // Filtrar por escola se uma escola estiver selecionada
    const matchEscola = selectedEscolaId ? t.escola_id === selectedEscolaId : true;
    // Filtrar apenas turmas de 5º e 9º ano (anos válidos para SAEB)
    const matchAnoEscolar = t.ano_escolar === 5 || t.ano_escolar === 9;
    // Se um simulado está selecionado, filtrar pelo ano escolar do simulado
    const matchAnoSimulado = selectedSimulado ? t.ano_escolar === selectedSimulado.ano_escolar : true;
    return matchEscola && matchAnoEscolar && matchAnoSimulado;
  });

  // Limpar turma selecionada se não estiver mais nas opções filtradas
  useEffect(() => {
    if (selectedTurmaId && !turmasFiltradas.find((t) => t.id === selectedTurmaId)) {
      setSelectedTurmaId(null);
    }
  }, [selectedEscolaId, selectedSimuladoId]);

  return (
    <Box>
      <AppBarWithUserMenu title="SAEB V2 - Relatórios Completos" showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Filters - Hidden on print */}
        <Paper sx={{ p: 3, mb: 3 }} className="no-print">
          <Typography variant="h6" gutterBottom>
            Filtros de Relatório
          </Typography>
          <Grid container spacing={2}>
            {/* Simulado - Obrigatório */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Simulado *</InputLabel>
                <Select
                  value={selectedSimuladoId}
                  label="Simulado *"
                  onChange={(e) => setSelectedSimuladoId(Number(e.target.value))}
                >
                  <MenuItem value={0} disabled>
                    -- Selecione um simulado --
                  </MenuItem>
                  {simulados.map((simulado) => (
                    <MenuItem key={simulado.id} value={simulado.id}>
                      {simulado.nome} - {simulado.ano_escolar}º ano
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Escola - Opcional */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Escola (Opcional)</InputLabel>
                <Select
                  value={selectedEscolaId || ''}
                  label="Escola (Opcional)"
                  onChange={(e) =>
                    setSelectedEscolaId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <MenuItem value="">-- Todas as escolas --</MenuItem>
                  {escolas.map((escola) => (
                    <MenuItem key={escola.id} value={escola.id}>
                      {escola.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Turma - Opcional (filtrada por escola e ano escolar) */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Turma (Opcional)</InputLabel>
                <Select
                  value={selectedTurmaId || ''}
                  label="Turma (Opcional)"
                  onChange={(e) =>
                    setSelectedTurmaId(e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={turmasFiltradas.length === 0}
                >
                  <MenuItem value="">-- Todas as turmas --</MenuItem>
                  {turmasFiltradas.map((turma) => (
                    <MenuItem key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.ano_escolar}º ano
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Disciplina - Opcional */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Disciplina (Opcional)</InputLabel>
                <Select
                  value={selectedDisciplina}
                  label="Disciplina (Opcional)"
                  onChange={(e) => setSelectedDisciplina(e.target.value as string)}
                >
                  <MenuItem value="">-- Todas as disciplinas --</MenuItem>
                  <MenuItem value="Língua Portuguesa">Língua Portuguesa</MenuItem>
                  <MenuItem value="Matemática">Matemática</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              disabled={!relatorioSimulado}
            >
              Imprimir
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={!relatorioSimulado}
            >
              Exportar PDF
            </Button>
          </Box>
        </Paper>

        {/* Show message if no simulado selected */}
        {selectedSimuladoId === 0 && (
          <Alert severity="info">Selecione um simulado para visualizar os relatórios.</Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Reports Content */}
        {!loading && selectedSimuladoId !== 0 && relatorioSimulado && (
          <>
            {/* Print Header - Only visible on print */}
            <Paper 
              className="print-only print-header" 
              sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: 'primary.main',
                color: 'white',
                '@media print': { display: 'block !important' }
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                Relatório SAEB - {selectedSimulado?.nome}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${selectedSimulado?.ano_escolar}º Ano`}
                  size="small"
                  sx={{ bgcolor: 'white', color: 'primary.main' }}
                />
                {selectedEscola && (
                  <Chip
                    label={`Escola: ${selectedEscola.nome}`}
                    size="small"
                    sx={{ bgcolor: 'white', color: 'primary.main' }}
                  />
                )}
                {selectedTurma && (
                  <Chip
                    label={`Turma: ${selectedTurma.nome}`}
                    size="small"
                    sx={{ bgcolor: 'white', color: 'primary.main' }}
                  />
                )}
                {selectedDisciplina && (
                  <Chip
                    label={selectedDisciplina}
                    size="small"
                    sx={{ bgcolor: 'white', color: 'primary.main' }}
                  />
                )}
              </Box>
            </Paper>

            {/* Header Info - Screen only */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }} className="no-print">
              <Typography variant="h5" gutterBottom>
                {selectedSimulado?.nome}
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Chip
                    label={`${selectedSimulado?.ano_escolar}º ano`}
                    size="small"
                    sx={{ bgcolor: 'white', color: 'primary.main' }}
                  />
                </Grid>
                {selectedEscola && (
                  <Grid item>
                    <Chip
                      label={`Escola: ${selectedEscola.nome}`}
                      size="small"
                      sx={{ bgcolor: 'white', color: 'primary.main' }}
                    />
                  </Grid>
                )}
                {selectedTurma && (
                  <Grid item>
                    <Chip
                      label={`Turma: ${selectedTurma.nome}`}
                      size="small"
                      sx={{ bgcolor: 'white', color: 'primary.main' }}
                    />
                  </Grid>
                )}
                {selectedDisciplina && (
                  <Grid item>
                    <Chip
                      label={selectedDisciplina}
                      size="small"
                      sx={{ bgcolor: 'white', color: 'primary.main' }}
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }} className="print-summary-cards">
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="h4" color="primary">
                          {relatorioSimulado.total_alunos_participantes}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Participantes
                        </Typography>
                      </Box>
                      <SchoolIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="h4" color="success.main">
                          {relatorioSimulado.total_alunos_finalizados}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Finalizados
                        </Typography>
                      </Box>
                      <CheckIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="h4" color="info.main">
                          {relatorioSimulado.media_geral.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Média Geral
                        </Typography>
                      </Box>
                      <TrendingIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="h4" color="success.main">
                          {relatorioSimulado.adequado}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Adequado
                        </Typography>
                      </Box>
                      <AssessmentIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs - Hidden on print, each tab content shown as separate page */}
            <Paper sx={{ p: 3 }} className="no-print">
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                <Tab label="Distribuição por Situação" />
                <Tab label="Análise por Descritor" />
              </Tabs>

              {/* Tab 1: Distribuição por Situação */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" gutterBottom>
                  Distribuição dos Alunos por Nível de Desempenho
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  {/* Adequado */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Chip label="Adequado" color="success" sx={{ mr: 2 }} />
                          <Typography variant="h4" color="success.main">
                            {relatorioSimulado.adequado}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            alunos (
                            {relatorioSimulado.total_alunos_finalizados > 0
                              ? (
                                  (relatorioSimulado.adequado /
                                    relatorioSimulado.total_alunos_finalizados) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            relatorioSimulado.total_alunos_finalizados > 0
                              ? (relatorioSimulado.adequado /
                                  relatorioSimulado.total_alunos_finalizados) *
                                100
                              : 0
                          }
                          color="success"
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Porcentagem acima de 89%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Intermediário I */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Chip label="Intermediário I" color="info" sx={{ mr: 2 }} />
                          <Typography variant="h4" color="info.main">
                            {relatorioSimulado.intermediario_i}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            alunos (
                            {relatorioSimulado.total_alunos_finalizados > 0
                              ? (
                                  (relatorioSimulado.intermediario_i /
                                    relatorioSimulado.total_alunos_finalizados) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            relatorioSimulado.total_alunos_finalizados > 0
                              ? (relatorioSimulado.intermediario_i /
                                  relatorioSimulado.total_alunos_finalizados) *
                                100
                              : 0
                          }
                          color="info"
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Porcentagem entre 75% e 89%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Intermediário II */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Chip label="Intermediário II" color="info" sx={{ mr: 2 }} />
                          <Typography variant="h4" color="info.main">
                            {relatorioSimulado.intermediario_ii}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            alunos (
                            {relatorioSimulado.total_alunos_finalizados > 0
                              ? (
                                  (relatorioSimulado.intermediario_ii /
                                    relatorioSimulado.total_alunos_finalizados) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            relatorioSimulado.total_alunos_finalizados > 0
                              ? (relatorioSimulado.intermediario_ii /
                                  relatorioSimulado.total_alunos_finalizados) *
                                100
                              : 0
                          }
                          color="info"
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Porcentagem entre 51% e 74%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Crítico */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Chip label="Crítico" color="warning" sx={{ mr: 2 }} />
                          <Typography variant="h4" color="warning.main">
                            {relatorioSimulado.critico}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            alunos (
                            {relatorioSimulado.total_alunos_finalizados > 0
                              ? (
                                  (relatorioSimulado.critico /
                                    relatorioSimulado.total_alunos_finalizados) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            relatorioSimulado.total_alunos_finalizados > 0
                              ? (relatorioSimulado.critico /
                                  relatorioSimulado.total_alunos_finalizados) *
                                100
                              : 0
                          }
                          color="warning"
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Porcentagem entre 26% e 50%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Muito Crítico */}
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Chip label="Muito Crítico" color="error" sx={{ mr: 2 }} />
                          <Typography variant="h4" color="error.main">
                            {relatorioSimulado.muito_critico}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            alunos (
                            {relatorioSimulado.total_alunos_finalizados > 0
                              ? (
                                  (relatorioSimulado.muito_critico /
                                    relatorioSimulado.total_alunos_finalizados) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            relatorioSimulado.total_alunos_finalizados > 0
                              ? (relatorioSimulado.muito_critico /
                                  relatorioSimulado.total_alunos_finalizados) *
                                100
                              : 0
                          }
                          color="error"
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Porcentagem até 25%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Tab 2: Análise por Descritor */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom>
                  Desempenho por Descritor
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {relatorioDescritores.length === 0 ? (
                  <Alert severity="info">
                    Nenhum dado de descritor disponível para este simulado.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MenuBookIcon fontSize="small" />
                              Descritor
                            </Box>
                          </TableCell>
                          <TableCell>Descrição</TableCell>
                          <TableCell align="center">Questões</TableCell>
                          <TableCell align="center">Acertos</TableCell>
                          <TableCell align="center">Erros</TableCell>
                          <TableCell align="center">% Acertos</TableCell>
                          <TableCell align="center">Desempenho</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatorioDescritores.map((desc) => {
                          const totalRespostas = desc.total_acertos + desc.total_erros;
                          const porcentagemAcertos = totalRespostas > 0
                            ? Math.round((desc.total_acertos / totalRespostas) * 100)
                            : null;

                          return (
                            <TableRow key={desc.descritor_id}>
                              <TableCell>
                                <Chip label={desc.descritor_codigo} size="small" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {desc.descritor_descricao}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={desc.total_questoes} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" color="success.main" fontWeight="medium">
                                  {desc.total_acertos}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" color="error.main">
                                  {desc.total_erros}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={porcentagemAcertos !== null ? `${porcentagemAcertos}%` : '-'}
                                  size="small"
                                  color={porcentagemAcertos !== null ? getDesempenhoColor(porcentagemAcertos) : 'default'}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ width: '100%' }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={porcentagemAcertos}
                                    color={getDesempenhoColor(porcentagemAcertos)}
                                    sx={{ height: 8, borderRadius: 4 }}
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>
            </Paper>

            {/* Print-only: Distribuição por Situação - Page 1 */}
            <Box className="print-only print-page-distribuicao" sx={{ '@media print': { display: 'block !important' } }}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Distribuição dos Alunos por Nível de Desempenho
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {/* Adequado */}
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip label="Adequado" color="success" size="small" sx={{ mr: 1 }} />
                        <Typography variant="h5" color="success.main">
                          {relatorioSimulado.adequado}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({relatorioSimulado.total_alunos_finalizados > 0
                            ? ((relatorioSimulado.adequado / relatorioSimulado.total_alunos_finalizados) * 100).toFixed(1)
                            : 0}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={relatorioSimulado.total_alunos_finalizados > 0 ? (relatorioSimulado.adequado / relatorioSimulado.total_alunos_finalizados) * 100 : 0} color="success" sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" color="text.secondary">Acima de 89%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Intermediário I */}
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip label="Intermediário I" color="info" size="small" sx={{ mr: 1 }} />
                        <Typography variant="h5" color="info.main">
                          {relatorioSimulado.intermediario_i}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({relatorioSimulado.total_alunos_finalizados > 0
                            ? ((relatorioSimulado.intermediario_i / relatorioSimulado.total_alunos_finalizados) * 100).toFixed(1)
                            : 0}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={relatorioSimulado.total_alunos_finalizados > 0 ? (relatorioSimulado.intermediario_i / relatorioSimulado.total_alunos_finalizados) * 100 : 0} color="info" sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" color="text.secondary">Entre 75% e 89%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Intermediário II */}
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip label="Intermediário II" color="info" size="small" sx={{ mr: 1 }} />
                        <Typography variant="h5" color="info.main">
                          {relatorioSimulado.intermediario_ii}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({relatorioSimulado.total_alunos_finalizados > 0
                            ? ((relatorioSimulado.intermediario_ii / relatorioSimulado.total_alunos_finalizados) * 100).toFixed(1)
                            : 0}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={relatorioSimulado.total_alunos_finalizados > 0 ? (relatorioSimulado.intermediario_ii / relatorioSimulado.total_alunos_finalizados) * 100 : 0} color="info" sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" color="text.secondary">Entre 51% e 74%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Crítico */}
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip label="Crítico" color="warning" size="small" sx={{ mr: 1 }} />
                        <Typography variant="h5" color="warning.main">
                          {relatorioSimulado.critico}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({relatorioSimulado.total_alunos_finalizados > 0
                            ? ((relatorioSimulado.critico / relatorioSimulado.total_alunos_finalizados) * 100).toFixed(1)
                            : 0}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={relatorioSimulado.total_alunos_finalizados > 0 ? (relatorioSimulado.critico / relatorioSimulado.total_alunos_finalizados) * 100 : 0} color="warning" sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" color="text.secondary">Entre 26% e 50%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Muito Crítico */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip label="Muito Crítico" color="error" size="small" sx={{ mr: 1 }} />
                        <Typography variant="h5" color="error.main">
                          {relatorioSimulado.muito_critico}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({relatorioSimulado.total_alunos_finalizados > 0
                            ? ((relatorioSimulado.muito_critico / relatorioSimulado.total_alunos_finalizados) * 100).toFixed(1)
                            : 0}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={relatorioSimulado.total_alunos_finalizados > 0 ? (relatorioSimulado.muito_critico / relatorioSimulado.total_alunos_finalizados) * 100 : 0} color="error" sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" color="text.secondary">Até 25%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Print-only: Análise por Descritor - Page 2 */}
            <div className="print-only print-page-descritores">
              {relatorioDescritores.length === 0 ? (
                <Alert severity="info">Nenhum dado de descritor disponível.</Alert>
              ) : (
                <table className="print-table-descritores">
                  <thead>
                    <tr>
                      <th colSpan={6} className="print-table-title">Desempenho por Descritor</th>
                    </tr>
                    <tr>
                      <th>Descritor</th>
                      <th>Descrição</th>
                      <th style={{ textAlign: 'center' }}>Questões</th>
                      <th style={{ textAlign: 'center' }}>Acertos</th>
                      <th style={{ textAlign: 'center' }}>Erros</th>
                      <th style={{ textAlign: 'center' }}>% Acertos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioDescritores.map((desc) => {
                      const totalRespostas = desc.total_acertos + desc.total_erros;
                      const porcentagemAcertos = totalRespostas > 0
                        ? Math.round((desc.total_acertos / totalRespostas) * 100)
                        : null;
                      return (
                        <tr key={desc.descritor_id}>
                          <td><strong>{desc.descritor_codigo}</strong></td>
                          <td>{desc.descritor_descricao}</td>
                          <td style={{ textAlign: 'center' }}>{desc.total_questoes}</td>
                          <td style={{ textAlign: 'center', color: '#2e7d32' }}>{desc.total_acertos}</td>
                          <td style={{ textAlign: 'center', color: '#d32f2f' }}>{desc.total_erros}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{porcentagemAcertos !== null ? `${porcentagemAcertos}%` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </Container>
    </Box>
  );
};

export default SAEBV2RelatoriosPage;
