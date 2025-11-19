/**
 * Avaliação de Alunos - Diagnóstico (PROFESSOR)
 * Modo Sequencial: Interface otimizada para avaliar turma completa
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  TextField,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  NavigateNext,
  NavigateBefore,
  PersonOff,
} from '@mui/icons-material';
import { diagnosticosAPI, alunosAPI } from '../services/api';
import {
  Diagnostico,
  ItemDiagnostico,
  Aluno,
  HipoteseEscrita,
  NivelEvolucao,
  AvaliacaoItem,
  DiagnosticoResultado,
} from '../types';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';

interface AlunoStatus {
  aluno: Aluno;
  avaliado: boolean;
  resultado?: DiagnosticoResultado;
}

const DiagnosticoAvaliar: React.FC = () => {
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunosStatus, setAlunosStatus] = useState<AlunoStatus[]>([]);
  const [selectedDiagnostico, setSelectedDiagnostico] = useState<number | ''>('');
  const [currentAlunoIndex, setCurrentAlunoIndex] = useState(0);
  const [itens, setItens] = useState<ItemDiagnostico[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Map<number, NivelEvolucao>>(new Map());
  const [hipoteseEscrita, setHipoteseEscrita] = useState<HipoteseEscrita | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDiagnosticos();
    loadAlunos();
  }, []);

  useEffect(() => {
    if (selectedDiagnostico && alunos.length > 0) {
      loadResultados();
    }
  }, [selectedDiagnostico, alunos]);

  const loadDiagnosticos = async () => {
    try {
      const response = await diagnosticosAPI.list({ ativo: true });
      setDiagnosticos(response.data);
    } catch (err) {
      setError('Erro ao carregar diagnósticos');
    }
  };

  const loadAlunos = async () => {
    try {
      const response = await alunosAPI.list({ ativo: true });
      setAlunos(response.data);
    } catch (err) {
      setError('Erro ao carregar alunos');
    }
  };

  const loadItens = async (diagnosticoId: number) => {
    try {
      const response = await diagnosticosAPI.get(diagnosticoId);
      setItens(response.data.itens || []);
    } catch (err) {
      setError('Erro ao carregar itens do diagnóstico');
    }
  };

  const loadResultados = async () => {
    try {
      const response = await diagnosticosAPI.listResultados({
        diagnostico_id: selectedDiagnostico,
      });
      const resultados = response.data;

      const statusList: AlunoStatus[] = alunos.map((aluno) => {
        const resultado = resultados.find((r: DiagnosticoResultado) => r.aluno_id === aluno.id);
        return {
          aluno,
          avaliado: !!resultado,
          resultado,
        };
      });

      setAlunosStatus(statusList);
    } catch (err) {
      console.error('Erro ao carregar resultados', err);
    }
  };

  const handleDiagnosticoChange = (diagnosticoId: number) => {
    setSelectedDiagnostico(diagnosticoId);
    setCurrentAlunoIndex(0);
    setAvaliacoes(new Map());
    setHipoteseEscrita('');
    setObservacoes('');
    loadItens(diagnosticoId);
  };

  const handleAvaliacaoChange = (itemId: number, resposta: NivelEvolucao) => {
    setAvaliacoes((prev) => new Map(prev).set(itemId, resposta));
  };

  const getCurrentAluno = (): AlunoStatus | null => {
    return alunosStatus[currentAlunoIndex] || null;
  };

  const goToNextAluno = () => {
    if (currentAlunoIndex < alunosStatus.length - 1) {
      setCurrentAlunoIndex(currentAlunoIndex + 1);
      clearForm();
    }
  };

  const goToPreviousAluno = () => {
    if (currentAlunoIndex > 0) {
      setCurrentAlunoIndex(currentAlunoIndex - 1);
      clearForm();
    }
  };

  const clearForm = () => {
    setAvaliacoes(new Map());
    setHipoteseEscrita('');
    setObservacoes('');
    setError('');
  };

  const handleSubmit = async () => {
    const currentAluno = getCurrentAluno();
    if (!selectedDiagnostico || !currentAluno) {
      setError('Selecione um diagnóstico');
      return;
    }

    if (avaliacoes.size === 0) {
      setError('Avalie pelo menos um item');
      return;
    }

    if (!hipoteseEscrita) {
      setError('Defina a hipótese de escrita do aluno');
      return;
    }

    const avaliacoes_itens: AvaliacaoItem[] = Array.from(avaliacoes.entries()).map(
      ([item_diagnostico_id, resposta]) => ({ item_diagnostico_id, resposta })
    );

    try {
      setLoading(true);
      await diagnosticosAPI.createResultado({
        diagnostico_id: selectedDiagnostico,
        aluno_id: currentAluno.aluno.id,
        hipotese_escrita: hipoteseEscrita,
        avaliacoes_itens,
        observacoes,
      });

      setSuccess(`Avaliação de ${currentAluno.aluno.nome_completo} salva com sucesso!`);

      // Atualizar status do aluno
      await loadResultados();

      // Ir para próximo aluno automaticamente
      setTimeout(() => {
        if (currentAlunoIndex < alunosStatus.length - 1) {
          goToNextAluno();
          setSuccess('');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleNaoAvaliado = async () => {
    const currentAluno = getCurrentAluno();
    if (!currentAluno) return;

    // Registrar como "não avaliado" com valores padrão
    try {
      setLoading(true);

      // Criar avaliação com todos itens como "NAO" e hipótese "Não Avaliado"
      const avaliacoes_itens: AvaliacaoItem[] = itens.map((item) => ({
        item_diagnostico_id: item.id,
        resposta: NivelEvolucao.NAO,
      }));

      await diagnosticosAPI.createResultado({
        diagnostico_id: selectedDiagnostico as number,
        aluno_id: currentAluno.aluno.id,
        hipotese_escrita: HipoteseEscrita.NAO_AVALIADO,
        avaliacoes_itens,
        observacoes: 'Aluno não avaliado',
      });

      setSuccess(`${currentAluno.aluno.nome_completo} marcado como não avaliado`);

      // Atualizar status e ir para próximo
      await loadResultados();

      setTimeout(() => {
        if (currentAlunoIndex < alunosStatus.length - 1) {
          goToNextAluno();
          setSuccess('');
        }
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const getHipoteseLabel = (hip: HipoteseEscrita) => {
    const labels = {
      [HipoteseEscrita.NAO_AVALIADO]: 'Não Avaliado',
      [HipoteseEscrita.PRE_SILABICO]: 'Pré-Silábico',
      [HipoteseEscrita.SILABICO_SEM_VALOR_SONORO]: 'Silábico Sem Valor',
      [HipoteseEscrita.SILABICO_COM_VALOR_SONORO]: 'Silábico Com Valor',
      [HipoteseEscrita.SILABICO_ALFABETICO]: 'Silábico Alfabético',
      [HipoteseEscrita.ALFABETICO]: 'Alfabético',
    };
    return labels[hip];
  };

  const getProgressStats = () => {
    const avaliados = alunosStatus.filter((a) => a.avaliado).length;
    const total = alunosStatus.length;
    const percentual = total > 0 ? (avaliados / total) * 100 : 0;
    return { avaliados, total, percentual };
  };

  const currentAluno = getCurrentAluno();
  const stats = getProgressStats();

  return (
    <Box>
      <AppBarWithUserMenu title="Aplicar Diagnóstico" showBackButton />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Seleção de Diagnóstico */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Diagnóstico</InputLabel>
            <Select
              value={selectedDiagnostico}
              onChange={(e) => handleDiagnosticoChange(e.target.value as number)}
              label="Diagnóstico"
            >
              {diagnosticos.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {selectedDiagnostico && alunosStatus.length > 0 && (
          <>
            {/* Barra de Progresso */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Progresso da Turma</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {stats.avaliados} / {stats.total} alunos avaliados
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={stats.percentual} sx={{ height: 10, borderRadius: 5 }} />
            </Paper>

            {/* Navegação do Aluno Atual */}
            {currentAluno && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <IconButton onClick={goToPreviousAluno} disabled={currentAlunoIndex === 0}>
                    <NavigateBefore />
                  </IconButton>

                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="overline" color="text.secondary">
                      Avaliando ({currentAlunoIndex + 1}/{alunosStatus.length})
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {currentAluno.aluno.nome_completo}
                    </Typography>
                    {currentAluno.avaliado && (
                      <Chip
                        label="Já Avaliado"
                        color="success"
                        size="small"
                        icon={<CheckCircle />}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>

                  <IconButton onClick={goToNextAluno} disabled={currentAlunoIndex === alunosStatus.length - 1}>
                    <NavigateNext />
                  </IconButton>
                </Box>

                {/* Botão Não Avaliado */}
                <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  startIcon={<PersonOff />}
                  onClick={handleNaoAvaliado}
                  disabled={loading || currentAluno.avaliado}
                >
                  Marcar como Não Avaliado
                </Button>
              </Paper>
            )}

            {/* Tabela de Itens de Avaliação */}
            {itens.length > 0 && currentAluno && !currentAluno.avaliado && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Avaliação dos Itens
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', width: '300px' }}>
                          Opções
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itens.map((item) => (
                        <TableRow key={item.id}>
                          {/* Coluna 1: Item */}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={item.modalidade === 'leitura' ? 'LEITURA' : 'ESCRITA'}
                                color={item.modalidade === 'leitura' ? 'primary' : 'secondary'}
                                size="small"
                              />
                              <Typography variant="body2">{item.descricao}</Typography>
                            </Box>
                          </TableCell>

                          {/* Coluna 2: Opções (Sim, Em Parte, Não) */}
                          <TableCell align="center">
                            <ToggleButtonGroup
                              value={avaliacoes.get(item.id) || ''}
                              exclusive
                              onChange={(_, value) => value && handleAvaliacaoChange(item.id, value)}
                              size="small"
                              sx={{
                                '& .MuiToggleButton-root': {
                                  '&.Mui-selected': {
                                    fontWeight: 'bold',
                                    boxShadow: 2,
                                  },
                                  '&.Mui-selected.MuiToggleButton-success': {
                                    backgroundColor: '#6af56eff',
                                    color: '#fff',
                                    '&:hover': {
                                      backgroundColor: '#49d150ff',
                                    },
                                  },
                                  '&.Mui-selected.MuiToggleButton-warning': {
                                    backgroundColor: '#f7b337f8',
                                    color: '#fff',
                                    '&:hover': {
                                      backgroundColor: '#eba338ff',
                                    },
                                  },
                                  '&.Mui-selected.MuiToggleButton-error': {
                                    backgroundColor: '#fd382aff',
                                    color: '#fff',
                                    '&:hover': {
                                      backgroundColor: '#dd1507ff',
                                    },
                                  },
                                },
                              }}
                            >
                              <ToggleButton value={NivelEvolucao.SIM} color="success">
                                Sim
                              </ToggleButton>
                              <ToggleButton value={NivelEvolucao.EM_PARTE} color="warning">
                                Em Parte
                              </ToggleButton>
                              <ToggleButton value={NivelEvolucao.NAO} color="error">
                                Não
                              </ToggleButton>
                            </ToggleButtonGroup>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider sx={{ my: 3 }} />

                {/* Hipótese de Escrita */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Hipótese de Escrita</InputLabel>
                  <Select
                    value={hipoteseEscrita}
                    onChange={(e) => setHipoteseEscrita(e.target.value as HipoteseEscrita)}
                    label="Hipótese de Escrita"
                  >
                    {Object.values(HipoteseEscrita)
                      .filter((hip) => hip !== HipoteseEscrita.NAO_AVALIADO)
                      .map((hip) => (
                        <MenuItem key={hip} value={hip}>
                          {getHipoteseLabel(hip)}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {/* Observações */}
                <TextField
                  fullWidth
                  label="Observações (opcional)"
                  multiline
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  sx={{ mb: 3 }}
                />

                {/* Botão Salvar */}
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  Salvar Avaliação
                </Button>
              </Paper>
            )}

            {/* Lista de Status dos Alunos */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Status da Turma
              </Typography>
              <Stack spacing={1}>
                {alunosStatus.map((alunoStatus, index) => (
                  <Box
                    key={alunoStatus.aluno.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      borderRadius: 1,
                      bgcolor: index === currentAlunoIndex ? 'action.selected' : 'transparent',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => {
                      setCurrentAlunoIndex(index);
                      clearForm();
                    }}
                  >
                    <Typography variant="body2">{alunoStatus.aluno.nome_completo}</Typography>
                    {alunoStatus.avaliado ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <RadioButtonUnchecked color="disabled" fontSize="small" />
                    )}
                  </Box>
                ))}
              </Stack>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default DiagnosticoAvaliar;
