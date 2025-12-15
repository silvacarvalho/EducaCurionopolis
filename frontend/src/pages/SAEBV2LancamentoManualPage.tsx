/**
 * SAEB V2 - Lançamento Manual Page
 * Interface for teachers to manually enter student responses from paper-based exams
 * Optimized: One student at a time to avoid performance issues
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Print as PrintIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Person as PersonIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API, alunosAPI } from '../services/api';
import {
  Aluno,
  ParticipacaoSimulado,
  SimuladoExportado,
  RespostaManual,
} from '../types';

const SAEBV2LancamentoManualPage: React.FC = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selection states
  const [participacoes, setParticipacoes] = useState<ParticipacaoSimulado[]>([]);
  const [selectedParticipacao, setSelectedParticipacao] = useState<ParticipacaoSimulado | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [simuladoExportado, setSimuladoExportado] = useState<SimuladoExportado | null>(null);

  // Current student selection
  const [selectedAlunoIndex, setSelectedAlunoIndex] = useState(0);
  const [alunosSalvos, setAlunosSalvos] = useState<Set<number>>(new Set());

  // Response tracking - single student at a time for better performance
  const [respostas, setRespostas] = useState<Map<number, Map<number, string>>>(new Map());
  // Map structure: Map<aluno_id, Map<simulado_questao_id, resposta>>

  const steps = ['Selecionar Simulado e Turma', 'Lançar Respostas', 'Finalizar'];

  // Current selected student
  const selectedAluno = useMemo(() => {
    return alunos[selectedAlunoIndex] || null;
  }, [alunos, selectedAlunoIndex]);

  // All questions flattened for easier iteration
  const todasQuestoes = useMemo(() => {
    if (!simuladoExportado) return [];
    const questoes: Array<{ id: number; ordem: number; disciplina: string; descritor_codigo: string }> = [];
    simuladoExportado.disciplinas.forEach(disc => {
      disc.blocos.forEach(bloco => {
        bloco.questoes.forEach(questao => {
          questoes.push({
            id: questao.id,
            ordem: questao.ordem,
            disciplina: disc.disciplina,
            descritor_codigo: questao.descritor_codigo,
          });
        });
      });
    });
    return questoes.sort((a, b) => a.ordem - b.ordem);
  }, [simuladoExportado]);

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
      setSelectedAlunoIndex(0);
      setAlunosSalvos(new Set());

      setActiveStep(1);
    } catch (error) {
      showNotification('Erro ao carregar dados do simulado', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save current student's responses to backend
  const salvarRespostasAluno = useCallback(async (alunoId: number, mostrarNotificacao: boolean = true) => {
    if (!selectedParticipacao || !simuladoExportado) return false;

    const alunoRespostas = respostas.get(alunoId);
    if (!alunoRespostas || alunoRespostas.size === 0) {
      // No responses to save
      return true;
    }

    try {
      setSaving(true);

      const respostasArray: RespostaManual[] = [];
      alunoRespostas.forEach((resposta, questaoId) => {
        respostasArray.push({
          simulado_questao_id: questaoId,
          resposta: resposta,
        });
      });

      const lancamentos = [{
        aluno_id: alunoId,
        simulado_id: selectedParticipacao.simulado_id,
        respostas: respostasArray,
      }];

      await saebV2API.lancamentoManualLote({
        simulado_id: selectedParticipacao.simulado_id,
        turma_id: selectedParticipacao.turma_id,
        lancamentos: lancamentos,
      });

      // Mark student as saved
      setAlunosSalvos(prev => new Set(prev).add(alunoId));

      if (mostrarNotificacao) {
        const aluno = alunos.find(a => a.id === alunoId);
        showNotification(`Respostas de ${aluno?.nome_completo || 'aluno'} salvas com sucesso!`, 'success');
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao salvar respostas:', error);
      showNotification(error.response?.data?.detail || 'Erro ao salvar respostas', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedParticipacao, simuladoExportado, respostas, alunos, showNotification]);

  // Navigate to different student (with auto-save)
  const navigateToAluno = useCallback(async (newIndex: number) => {
    if (newIndex < 0 || newIndex >= alunos.length) return;

    // Save current student's responses before navigating
    if (selectedAluno) {
      const alunoRespostas = respostas.get(selectedAluno.id);
      if (alunoRespostas && alunoRespostas.size > 0) {
        const saved = await salvarRespostasAluno(selectedAluno.id, false);
        if (!saved) {
          // Ask user if they want to continue without saving
          const continuar = window.confirm('Erro ao salvar. Deseja continuar sem salvar?');
          if (!continuar) return;
        }
      }
    }

    setSelectedAlunoIndex(newIndex);
  }, [alunos.length, selectedAluno, respostas, salvarRespostasAluno]);

  const handleRespostaChange = useCallback((questaoId: number, resposta: string) => {
    if (!selectedAluno) return;

    setRespostas(prev => {
      const newRespostas = new Map(prev);
      const alunoRespostas = new Map(prev.get(selectedAluno.id) || new Map());
      alunoRespostas.set(questaoId, resposta);
      newRespostas.set(selectedAluno.id, alunoRespostas);
      return newRespostas;
    });

    // Remove from saved list since there are unsaved changes
    setAlunosSalvos(prev => {
      const newSet = new Set(prev);
      newSet.delete(selectedAluno.id);
      return newSet;
    });
  }, [selectedAluno]);

  const handleFinalizar = async () => {
    // Save current student first
    if (selectedAluno) {
      const alunoRespostas = respostas.get(selectedAluno.id);
      if (alunoRespostas && alunoRespostas.size > 0 && !alunosSalvos.has(selectedAluno.id)) {
        await salvarRespostasAluno(selectedAluno.id, false);
      }
    }

    // Go to finalization step
    setActiveStep(2);
  };

  const handlePrintSimulado = async () => {
    if (!selectedParticipacao) return;
    const url = `/saeb-v2/simulado/${selectedParticipacao.simulado_id}/imprimir`;
    window.open(url, '_blank');
  };

  // Progress calculations
  const getProgressoAluno = useCallback((alunoId: number): number => {
    const alunoRespostas = respostas.get(alunoId);
    if (!alunoRespostas || !simuladoExportado) return 0;
    const totalQuestoes = simuladoExportado.total_questoes;
    const respostasCount = alunoRespostas.size;
    return Math.round((respostasCount / totalQuestoes) * 100);
  }, [respostas, simuladoExportado]);

  const progressoGeral = useMemo(() => {
    if (!simuladoExportado || alunos.length === 0) return { respostas: 0, total: 0, percent: 0 };
    const totalPossivel = alunos.length * simuladoExportado.total_questoes;
    let totalRespostas = 0;
    respostas.forEach(alunoRespostas => {
      totalRespostas += alunoRespostas.size;
    });
    return {
      respostas: totalRespostas,
      total: totalPossivel,
      percent: Math.round((totalRespostas / totalPossivel) * 100),
    };
  }, [respostas, simuladoExportado, alunos]);

  const alunosComProgresso = useMemo(() => {
    return alunos.filter(a => {
      const r = respostas.get(a.id);
      return r && r.size > 0;
    }).length;
  }, [alunos, respostas]);

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

        {/* Step 1: Enter Responses - One student at a time */}
        {activeStep === 1 && selectedParticipacao && simuladoExportado && selectedAluno && (
          <>
            {/* Progress Header - Compacto */}
            <Paper sx={{ mb: 1, p: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                <Typography variant="subtitle1" fontWeight="bold" noWrap>{simuladoExportado.simulado_nome}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedParticipacao.turma?.nome} | {simuladoExportado.ano_escolar}º ano
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                <LinearProgress
                  variant="determinate"
                  value={progressoGeral.percent}
                  sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                />
                <Typography variant="caption" fontWeight="bold">{progressoGeral.percent}%</Typography>
              </Box>
              <Chip label={`${alunosComProgresso}/${alunos.length} alunos`} size="small" variant="outlined" />
              <Chip label={`${progressoGeral.respostas}/${progressoGeral.total} resp.`} size="small" color="primary" />
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrintSimulado}
                size="small"
              >
                Imprimir
              </Button>
            </Paper>

            <Grid container spacing={1}>
              {/* Student List - Left Sidebar */}
              <Grid item xs={12} md={2.5}>
                <Paper sx={{ height: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'white' }}>
                    <Typography variant="body2" fontWeight="bold">Alunos ({alunos.length})</Typography>
                  </Box>
                  <List sx={{ flexGrow: 1, overflow: 'auto', py: 0 }}>
                    {alunos.map((aluno, index) => {
                      const progresso = getProgressoAluno(aluno.id);
                      const salvo = alunosSalvos.has(aluno.id);
                      const isSelected = index === selectedAlunoIndex;

                      return (
                        <React.Fragment key={aluno.id}>
                          <ListItemButton
                            selected={isSelected}
                            onClick={() => navigateToAluno(index)}
                            sx={{
                              borderLeft: isSelected ? 4 : 0,
                              borderColor: 'primary.main',
                              bgcolor: isSelected ? 'action.selected' : undefined,
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {salvo ? (
                                <CheckIcon color="success" fontSize="small" />
                              ) : progresso > 0 ? (
                                <PersonIcon color="primary" fontSize="small" />
                              ) : (
                                <PersonIcon color="disabled" fontSize="small" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" noWrap fontWeight={isSelected ? 'bold' : 'normal'}>
                                  {aluno.nome_completo}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={progresso}
                                    sx={{ flexGrow: 1, height: 4, borderRadius: 1 }}
                                    color={salvo ? 'success' : 'primary'}
                                  />
                                  <Typography variant="caption" sx={{ minWidth: 32 }}>
                                    {progresso}%
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItemButton>
                          <Divider />
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Paper>
              </Grid>

              {/* Response Entry - Main Area */}
              <Grid item xs={12} md={9.5}>
                <Paper sx={{ p: 1.5, height: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}>
                  {/* Student Header with Navigation - Compacto */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tooltip title="Aluno anterior (salva automaticamente)">
                        <span>
                          <IconButton
                            onClick={() => navigateToAluno(selectedAlunoIndex - 1)}
                            disabled={selectedAlunoIndex === 0 || saving}
                            color="primary"
                            size="small"
                          >
                            <PrevIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">{selectedAluno.nome_completo}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedAluno.matricula} | {selectedAlunoIndex + 1}/{alunos.length}
                        </Typography>
                      </Box>
                      <Tooltip title="Próximo aluno (salva automaticamente)">
                        <span>
                          <IconButton
                            onClick={() => navigateToAluno(selectedAlunoIndex + 1)}
                            disabled={selectedAlunoIndex === alunos.length - 1 || saving}
                            color="primary"
                            size="small"
                          >
                            <NextIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {saving && <CircularProgress size={20} />}
                      {alunosSalvos.has(selectedAluno.id) && (
                        <Chip icon={<CheckIcon />} label="Salvo" color="success" size="small" sx={{ height: 24 }} />
                      )}
                      <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        onClick={() => salvarRespostasAluno(selectedAluno.id)}
                        disabled={saving || (respostas.get(selectedAluno.id)?.size || 0) === 0}
                        size="small"
                      >
                        Salvar
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 1 }} />

                  {/* Questions List - Uma coluna */}
                  <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    {todasQuestoes.map((questao) => {
                      const resposta = respostas.get(selectedAluno.id)?.get(questao.id) || '';
                      return (
                        <Box
                          key={questao.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            py: 0.75,
                            px: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: resposta ? 'success.50' : 'background.paper',
                            '&:hover': { bgcolor: resposta ? 'success.100' : 'action.hover' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 35 }}>
                              Q{questao.ordem}
                            </Typography>
                            <Chip
                              label={questao.disciplina.slice(0, 3).toUpperCase()}
                              size="small"
                              color={questao.disciplina.toLowerCase().includes('mat') ? 'primary' : 'secondary'}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {['A', 'B', 'C', 'D', 'E'].map(alt => (
                              <Button
                                key={alt}
                                variant={resposta === alt ? 'contained' : 'outlined'}
                                color={resposta === alt ? 'primary' : 'inherit'}
                                size="small"
                                onClick={() => handleRespostaChange(questao.id, alt)}
                                sx={{
                                  minWidth: 36,
                                  px: 1,
                                  py: 0.5,
                                  fontWeight: resposta === alt ? 'bold' : 'normal',
                                }}
                              >
                                {alt}
                              </Button>
                            ))}
                          </Box>
                          {resposta && (
                            <CheckIcon color="success" fontSize="small" />
                          )}
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Footer Actions - Compacto */}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Button onClick={() => setActiveStep(0)} size="small">Voltar</Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<PrevIcon />}
                        onClick={() => navigateToAluno(selectedAlunoIndex - 1)}
                        disabled={selectedAlunoIndex === 0 || saving}
                      >
                        Anterior
                      </Button>
                      {selectedAlunoIndex < alunos.length - 1 ? (
                        <Button
                          variant="contained"
                          endIcon={<NextIcon />}
                          onClick={() => navigateToAluno(selectedAlunoIndex + 1)}
                          disabled={saving}
                        >
                          Próximo Aluno
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="success"
                          onClick={handleFinalizar}
                          disabled={saving || alunosComProgresso === 0}
                        >
                          Finalizar Lançamento
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}

        {/* Step 2: Finalization Summary */}
        {activeStep === 2 && selectedParticipacao && simuladoExportado && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Lançamento Finalizado
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              Os lançamentos foram salvos automaticamente durante o processo.
            </Alert>

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
                    <Typography variant="h4" color="primary">{alunosComProgresso}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Alunos Salvos</Typography>
                    <Typography variant="h4" color="success.main">{alunosSalvos.size}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setActiveStep(1)}>Voltar para Edição</Button>
              <Button
                variant="contained"
                onClick={() => navigate('/saeb-v2/professor')}
              >
                Concluir
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
};

export default SAEBV2LancamentoManualPage;
