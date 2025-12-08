/**
 * SAEB V2 - Lançamento Manual Page
 * Interface for teachers to manually enter student responses from paper-based exams
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  RadioGroup,
  Radio,
  FormControlLabel,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Print as PrintIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API, turmasAPI, alunosAPI } from '../services/api';
import {
  SimuladoSAEB,
  Turma,
  Aluno,
  ParticipacaoSimulado,
  SimuladoExportado,
  RespostaManual,
  LancamentoManualBulkResponse,
} from '../types';

const SAEBV2LancamentoManualPage: React.FC = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Selection states
  const [participacoes, setParticipacoes] = useState<ParticipacaoSimulado[]>([]);
  const [selectedParticipacao, setSelectedParticipacao] = useState<ParticipacaoSimulado | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [simuladoExportado, setSimuladoExportado] = useState<SimuladoExportado | null>(null);

  // Response tracking
  const [respostas, setRespostas] = useState<Map<number, Map<number, string>>>(new Map());
  // Map structure: Map<aluno_id, Map<simulado_questao_id, resposta>>

  // Result dialog
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultData, setResultData] = useState<LancamentoManualBulkResponse | null>(null);

  const steps = ['Selecionar Simulado e Turma', 'Lançar Respostas', 'Confirmar e Salvar'];

  useEffect(() => {
    loadParticipacoes();
  }, []);

  const loadParticipacoes = async () => {
    try {
      setLoading(true);
      const response = await saebV2API.listMinhasParticipacoes();
      setParticipacoes(response.data);
    } catch (error) {
      showNotification('Erro ao carregar participações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectParticipacao = async (participacaoId: number) => {
    const part = participacoes.find(p => p.id === participacaoId);
    if (!part) return;

    try {
      setLoading(true);
      setSelectedParticipacao(part);

      // Load alunos da turma
      const alunosResponse = await alunosAPI.list({ turma_id: part.turma_id });
      setAlunos(alunosResponse.data);

      // Load simulado exportado (questões organizadas)
      const simuladoResponse = await saebV2API.exportarSimulado(part.simulado_id);
      setSimuladoExportado(simuladoResponse.data);

      // Initialize empty responses for all students
      const initialRespostas = new Map<number, Map<number, string>>();
      alunosResponse.data.forEach((aluno: Aluno) => {
        initialRespostas.set(aluno.id, new Map());
      });
      setRespostas(initialRespostas);

      setActiveStep(1);
    } catch (error) {
      showNotification('Erro ao carregar dados do simulado', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRespostaChange = (alunoId: number, questaoId: number, resposta: string) => {
    setRespostas(prev => {
      const newRespostas = new Map(prev);
      const alunoRespostas = new Map(prev.get(alunoId) || new Map());
      alunoRespostas.set(questaoId, resposta);
      newRespostas.set(alunoId, alunoRespostas);
      return newRespostas;
    });
  };

  const handleSalvar = async () => {
    if (!selectedParticipacao || !simuladoExportado) return;

    try {
      setLoading(true);

      // Build lancamentos array
      const lancamentos = alunos.map(aluno => {
        const alunoRespostas = respostas.get(aluno.id) || new Map();
        const respostasArray: RespostaManual[] = [];

        // Convert Map to array
        simuladoExportado.disciplinas.forEach(disc => {
          disc.blocos.forEach(bloco => {
            bloco.questoes.forEach(questao => {
              const resposta = alunoRespostas.get(questao.id);
              if (resposta) {
                respostasArray.push({
                  simulado_questao_id: questao.id,
                  resposta: resposta,
                });
              }
            });
          });
        });

        return {
          aluno_id: aluno.id,
          simulado_id: selectedParticipacao.simulado_id,
          respostas: respostasArray,
        };
      }).filter(l => l.respostas.length > 0); // Only students with at least one answer

      if (lancamentos.length === 0) {
        showNotification('Nenhuma resposta foi lançada', 'warning');
        return;
      }

      // Send bulk request
      const response = await saebV2API.lancamentoManualLote({
        simulado_id: selectedParticipacao.simulado_id,
        turma_id: selectedParticipacao.turma_id,
        lancamentos: lancamentos,
      });

      setResultData(response.data);
      setResultDialogOpen(true);
    } catch (error: any) {
      console.error('Erro ao salvar lançamentos:', error);
      showNotification(error.response?.data?.detail || 'Erro ao salvar lançamentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSimulado = async () => {
    if (!selectedParticipacao) return;

    // Open simulado in new window for printing
    const url = `/saeb-v2/simulado/${selectedParticipacao.simulado_id}/imprimir`;
    window.open(url, '_blank');
  };

  const getProgressoAluno = (alunoId: number): number => {
    const alunoRespostas = respostas.get(alunoId);
    if (!alunoRespostas || !simuladoExportado) return 0;

    const totalQuestoes = simuladoExportado.total_questoes;
    const respostasCount = alunoRespostas.size;
    return Math.round((respostasCount / totalQuestoes) * 100);
  };

  const getTotalRespostas = (): number => {
    let total = 0;
    respostas.forEach(alunoRespostas => {
      total += alunoRespostas.size;
    });
    return total;
  };

  if (loading && activeStep === 0) {
    return (
      <MainLayout title="Lançamento Manual SAEB">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Lançamento Manual de Resultados SAEB">
      <Box sx={{ width: '100%', height: '100%' }}>
        {/* Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Step 0: Select Participation */}
        {activeStep === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Selecione o Simulado e Turma
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Escolha o simulado e a turma para lançar as respostas dos alunos que realizaram a prova em papel.
            </Typography>

            {participacoes.length === 0 ? (
              <Alert severity="info">
                Nenhum simulado liberado encontrado. Libere um simulado para uma turma primeiro.
              </Alert>
            ) : (
              <FormControl fullWidth sx={{ mt: 3 }}>
                <InputLabel>Selecione o Simulado e Turma</InputLabel>
                <Select
                  label="Selecione o Simulado e Turma"
                  onChange={(e) => handleSelectParticipacao(Number(e.target.value))}
                >
                  {participacoes.map((part) => (
                    <MenuItem key={part.id} value={part.id}>
                      {part.simulado?.nome || `Simulado #${part.simulado_id}`} - {part.turma?.nome || `Turma #${part.turma_id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Paper>
        )}

        {/* Step 1: Enter Responses */}
        {activeStep === 1 && selectedParticipacao && simuladoExportado && (
          <>
            {/* Header Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6">{simuladoExportado.simulado_nome}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Turma: {selectedParticipacao.turma?.nome} | {simuladoExportado.ano_escolar}º ano | {simuladoExportado.ano_letivo}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Total de Questões</Typography>
                    <Typography variant="h5">{simuladoExportado.total_questoes}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Respostas Lançadas</Typography>
                    <Typography variant="h5" color="primary">{getTotalRespostas()}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={handlePrintSimulado}
                      size="small"
                    >
                      Imprimir Simulado
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Responses Table */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Lançar Respostas dos Alunos
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Lance as respostas de cada aluno conforme as provas em papel. Você pode deixar questões em branco se o aluno não respondeu.
              </Alert>

              <TableContainer sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 200, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 3 }}>
                        Aluno
                      </TableCell>
                      <TableCell sx={{ minWidth: 100 }}>Progresso</TableCell>
                      {simuladoExportado.disciplinas.map(disc =>
                        disc.blocos.map(bloco =>
                          bloco.questoes.map(questao => (
                            <TableCell key={questao.id} align="center" sx={{ minWidth: 80 }}>
                              <Typography variant="caption" display="block">
                                Q{questao.ordem}
                              </Typography>
                            </TableCell>
                          ))
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alunos.map((aluno) => {
                      const progresso = getProgressoAluno(aluno.id);
                      return (
                        <TableRow key={aluno.id}>
                          <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {aluno.nome_completo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {aluno.matricula}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={progresso}
                                sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                              />
                              <Typography variant="caption">{progresso}%</Typography>
                            </Box>
                          </TableCell>
                          {simuladoExportado.disciplinas.map(disc =>
                            disc.blocos.map(bloco =>
                              bloco.questoes.map(questao => {
                                const resposta = respostas.get(aluno.id)?.get(questao.id) || '';
                                return (
                                  <TableCell key={questao.id} align="center">
                                    <RadioGroup
                                      row
                                      value={resposta}
                                      onChange={(e) => handleRespostaChange(aluno.id, questao.id, e.target.value)}
                                      sx={{ justifyContent: 'center', gap: 0.5 }}
                                    >
                                      {['a', 'b', 'c', 'd', 'e'].map(alt => (
                                        <FormControlLabel
                                          key={alt}
                                          value={alt}
                                          control={<Radio size="small" />}
                                          label={alt.toUpperCase()}
                                          labelPlacement="top"
                                          sx={{
                                            m: 0,
                                            '& .MuiFormControlLabel-label': {
                                              fontSize: '0.75rem',
                                            },
                                          }}
                                        />
                                      ))}
                                    </RadioGroup>
                                  </TableCell>
                                );
                              })
                            )
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={() => setActiveStep(0)}>Voltar</Button>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                  disabled={getTotalRespostas() === 0}
                >
                  Revisar e Salvar
                </Button>
              </Box>
            </Paper>
          </>
        )}

        {/* Step 2: Confirm and Save */}
        {activeStep === 2 && selectedParticipacao && simuladoExportado && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Revisar e Confirmar Lançamento
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Total de Alunos</Typography>
                    <Typography variant="h4">{alunos.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Alunos com Respostas</Typography>
                    <Typography variant="h4" color="primary">
                      {Array.from(respostas.values()).filter(r => r.size > 0).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Total de Respostas</Typography>
                    <Typography variant="h4" color="success.main">{getTotalRespostas()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>Atenção:</strong> Após confirmar, os resultados serão calculados automaticamente e não poderão ser alterados.
              Verifique se todas as respostas foram lançadas corretamente.
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setActiveStep(1)}>Voltar</Button>
              <Button
                variant="contained"
                color="success"
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSalvar}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Confirmar e Salvar'}
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Result Dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            Resultado do Lançamento
          </Box>
        </DialogTitle>
        <DialogContent>
          {resultData && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3">{resultData.total_lancamentos}</Typography>
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="success.dark">{resultData.sucesso}</Typography>
                      <Typography variant="body2" color="success.dark">Sucesso</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ bgcolor: 'error.light' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="error.dark">{resultData.falhas}</Typography>
                      <Typography variant="body2" color="error.dark">Falhas</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {resultData.falhas > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Alguns lançamentos falharam. Verifique os detalhes abaixo.
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Aluno</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Detalhes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultData.resultados.map((res, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{res.aluno_nome}</TableCell>
                        <TableCell>
                          {res.success ? (
                            <Chip label="Sucesso" size="small" color="success" icon={<SuccessIcon />} />
                          ) : (
                            <Chip label="Erro" size="small" color="error" icon={<ErrorIcon />} />
                          )}
                        </TableCell>
                        <TableCell>
                          {res.success ? (
                            <Typography variant="body2">
                              {res.resultado?.total_acertos}/{res.resultado?.total_questoes} acertos ({res.resultado?.porcentagem}%)
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="error">{res.error}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setResultDialogOpen(false);
            navigate('/saeb-v2/professor');
          }}>
            Fechar e Voltar
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default SAEBV2LancamentoManualPage;
