/**
 * SAEB V2 - Resultados Page
 * Interface for viewing student results by turma and simulado
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
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
  TableSortLabel,
  Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  TrendingUp as TrendingIcon,
  EmojiEvents as TrophyIcon,
  Print as PrintIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API, turmasAPI } from '../services/api';
import { ResultadoSimuladoAluno, SimuladoSAEB, Turma, SituacaoSAEB } from '../types';

type Order = 'asc' | 'desc';
type OrderBy = 'nome' | 'total_acertos' | 'porcentagem' | 'situacao';

const SAEBV2ResultadosPage: React.FC = () => {
  const { turmaId: urlTurmaId, simuladoId: urlSimuladoId } = useParams<{
    turmaId: string;
    simuladoId: string;
  }>();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoSimuladoAluno[]>([]);
  const [simulados, setSimulados] = useState<SimuladoSAEB[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<number>(
    urlTurmaId ? Number(urlTurmaId) : 0
  );
  const [selectedSimuladoId, setSelectedSimuladoId] = useState<number>(
    urlSimuladoId ? Number(urlSimuladoId) : 0
  );

  // Sort state
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('nome');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTurmaId && selectedSimuladoId) {
      loadResultados();
    }
  }, [selectedTurmaId, selectedSimuladoId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [simuladosResponse, turmasResponse] = await Promise.all([
        saebV2API.listSimulados(),
        turmasAPI.list(),
      ]);

      setSimulados(simuladosResponse.data);
      setTurmas(turmasResponse.data);

      // If we have URL params, load results
      if (urlTurmaId && urlSimuladoId) {
        await loadResultados();
      }
    } catch (error) {
      showNotification('Erro ao carregar dados iniciais', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadResultados = async () => {
    if (!selectedTurmaId || !selectedSimuladoId) return;

    try {
      setLoading(true);
      const response = await saebV2API.getResultadosTurma(
        selectedTurmaId,
        selectedSimuladoId
      );
      setResultados(response.data);
    } catch (error: any) {
      showNotification(
        error.response?.data?.detail || 'Erro ao carregar resultados',
        'error'
      );
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getSituacaoColor = (situacao: SituacaoSAEB) => {
    switch (situacao) {
      case SituacaoSAEB.ADEQUADO:
        return 'success';
      case SituacaoSAEB.INTERMEDIARIO_I:
      case SituacaoSAEB.INTERMEDIARIO_II:
        return 'info';
      case SituacaoSAEB.CRITICO:
        return 'warning';
      case SituacaoSAEB.MUITO_CRITICO:
        return 'error';
      default:
        return 'default';
    }
  };

  const getSituacaoLabel = (situacao: SituacaoSAEB) => {
    switch (situacao) {
      case SituacaoSAEB.ADEQUADO:
        return 'Adequado';
      case SituacaoSAEB.INTERMEDIARIO_I:
        return 'Intermediário I';
      case SituacaoSAEB.INTERMEDIARIO_II:
        return 'Intermediário II';
      case SituacaoSAEB.CRITICO:
        return 'Crítico';
      case SituacaoSAEB.MUITO_CRITICO:
        return 'Muito Crítico';
      default:
        return situacao;
    }
  };

  const getSituacaoIcon = (situacao: SituacaoSAEB): React.ReactElement | undefined => {
    switch (situacao) {
      case SituacaoSAEB.ADEQUADO:
        return <TrophyIcon fontSize="small" />;
      case SituacaoSAEB.INTERMEDIARIO_I:
      case SituacaoSAEB.INTERMEDIARIO_II:
        return <TrendingIcon fontSize="small" />;
      case SituacaoSAEB.CRITICO:
        return <CancelIcon fontSize="small" />;
      case SituacaoSAEB.MUITO_CRITICO:
        return <CancelIcon fontSize="small" />;
      default:
        return undefined;
    }
  };

  // Sort function
  const sortedResultados = React.useMemo(() => {
    const comparator = (a: ResultadoSimuladoAluno, b: ResultadoSimuladoAluno) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case 'nome':
          aValue = a.aluno?.nome_completo || '';
          bValue = b.aluno?.nome_completo || '';
          break;
        case 'total_acertos':
          aValue = a.total_acertos;
          bValue = b.total_acertos;
          break;
        case 'porcentagem':
          aValue = a.porcentagem;
          bValue = b.porcentagem;
          break;
        case 'situacao':
          // Order: ADEQUADO > INTERMEDIARIO_I > INTERMEDIARIO_II > CRITICO > MUITO_CRITICO
          const situacaoOrder = {
            [SituacaoSAEB.ADEQUADO]: 5,
            [SituacaoSAEB.INTERMEDIARIO_I]: 4,
            [SituacaoSAEB.INTERMEDIARIO_II]: 3,
            [SituacaoSAEB.CRITICO]: 2,
            [SituacaoSAEB.MUITO_CRITICO]: 1,
          };
          aValue = situacaoOrder[a.situacao] || 0;
          bValue = situacaoOrder[b.situacao] || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    };

    return [...resultados].sort(comparator);
  }, [resultados, order, orderBy]);

  // Statistics
  const totalAlunos = resultados.length;
  const alunosFinalizados = resultados.filter((r) => r.finalizado).length;
  const mediaGeral =
    totalAlunos > 0
      ? Math.round(
          resultados.reduce((sum, r) => sum + r.porcentagem, 0) / totalAlunos
        )
      : 0;

  const situacaoStats = {
    adequado: resultados.filter((r) => r.situacao === SituacaoSAEB.ADEQUADO).length,
    intermediario_i: resultados.filter((r) => r.situacao === SituacaoSAEB.INTERMEDIARIO_I)
      .length,
    intermediario_ii: resultados.filter((r) => r.situacao === SituacaoSAEB.INTERMEDIARIO_II)
      .length,
    critico: resultados.filter((r) => r.situacao === SituacaoSAEB.CRITICO).length,
    muito_critico: resultados.filter((r) => r.situacao === SituacaoSAEB.MUITO_CRITICO).length,
  };

  const selectedSimulado = simulados.find((s) => s.id === selectedSimuladoId);
  const selectedTurma = turmas.find((t) => t.id === selectedTurmaId);

  return (
    <MainLayout title="SAEB V2 - Resultados por Turma">
      <Box sx={{ width: '100%', height: '100%' }}>
        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={selectedTurmaId}
                  label="Turma"
                  onChange={(e) => setSelectedTurmaId(Number(e.target.value))}
                >
                  <MenuItem value={0} disabled>
                    -- Selecione uma turma --
                  </MenuItem>
                  {turmas.map((turma) => (
                    <MenuItem key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.ano_escolar}º ano
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Simulado</InputLabel>
                <Select
                  value={selectedSimuladoId}
                  label="Simulado"
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
          </Grid>
        </Paper>

        {/* Show message if no filters selected */}
        {(!selectedTurmaId || !selectedSimuladoId) && (
          <Alert severity="info">
            Selecione uma turma e um simulado para visualizar os resultados.
          </Alert>
        )}

        {/* Statistics Cards */}
        {selectedTurmaId && selectedSimuladoId && resultados.length > 0 && (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
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
                          {totalAlunos}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total de Alunos
                        </Typography>
                      </Box>
                      <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
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
                          {alunosFinalizados}
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
                          {mediaGeral}%
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
                          {situacaoStats.adequado}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Adequado
                        </Typography>
                      </Box>
                      <TrophyIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Situação Distribution */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Distribuição por Situação
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} md={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label={situacaoStats.adequado}
                      color="success"
                      sx={{ fontSize: 20, width: '100%', height: 40 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Adequado
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label={situacaoStats.intermediario_i}
                      color="info"
                      sx={{ fontSize: 20, width: '100%', height: 40 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Intermediário I
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label={situacaoStats.intermediario_ii}
                      color="info"
                      sx={{ fontSize: 20, width: '100%', height: 40 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Intermediário II
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label={situacaoStats.critico}
                      color="warning"
                      sx={{ fontSize: 20, width: '100%', height: 40 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Crítico
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label={situacaoStats.muito_critico}
                      color="error"
                      sx={{ fontSize: 20, width: '100%', height: 40 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Muito Crítico
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}

        {/* Results Table */}
        {selectedTurmaId && selectedSimuladoId && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Resultados Individuais
                {selectedTurma && selectedSimulado && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    {selectedTurma.nome} - {selectedSimulado.nome}
                  </Typography>
                )}
              </Typography>
              <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
                Imprimir
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : resultados.length === 0 ? (
              <Alert severity="info">
                Nenhum resultado encontrado para esta turma e simulado.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'nome'}
                          direction={orderBy === 'nome' ? order : 'asc'}
                          onClick={() => handleRequestSort('nome')}
                        >
                          Aluno
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'total_acertos'}
                          direction={orderBy === 'total_acertos' ? order : 'asc'}
                          onClick={() => handleRequestSort('total_acertos')}
                        >
                          Acertos
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">Erros</TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'porcentagem'}
                          direction={orderBy === 'porcentagem' ? order : 'asc'}
                          onClick={() => handleRequestSort('porcentagem')}
                        >
                          Porcentagem
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={orderBy === 'situacao'}
                          direction={orderBy === 'situacao' ? order : 'asc'}
                          onClick={() => handleRequestSort('situacao')}
                        >
                          Situação
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedResultados.map((resultado) => (
                      <TableRow
                        key={resultado.id}
                        sx={{
                          '&:hover': { bgcolor: 'action.hover' },
                          opacity: resultado.finalizado ? 1 : 0.6,
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {resultado.aluno?.nome_completo || 'Aluno não encontrado'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="success.main" fontWeight="medium">
                            {resultado.total_acertos}/{resultado.total_questoes}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="error.main">
                            {resultado.total_erros}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${resultado.porcentagem}%`}
                            size="small"
                            color={resultado.porcentagem > 74 ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getSituacaoIcon(resultado.situacao)}
                            label={getSituacaoLabel(resultado.situacao)}
                            size="small"
                            color={getSituacaoColor(resultado.situacao)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={resultado.finalizado ? 'Finalizado' : 'Em andamento'}
                            size="small"
                            color={resultado.finalizado ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
};

export default SAEBV2ResultadosPage;
