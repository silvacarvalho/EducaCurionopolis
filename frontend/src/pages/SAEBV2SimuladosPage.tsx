/**
 * SAEB V2 - Simulados Management Page (Gestão Municipal)
 * Interface moderna, elegante e intuitiva para criar simulados multi-disciplina
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  School as SchoolIcon,
  MenuBook as BookIcon,
  Calculate as CalculateIcon,
  PlaylistAddCheck as QuestoesIcon,
  Assessment as AnaliseIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import {
  SimuladoSAEB,
  QuestaoSAEB,
  DisciplinaSAEB,
  BlocoSAEB,
  StatusSimulado,
  SimuladoSAEBCreate,
  ConfiguracaoSAEB,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={value === index} timeout={300}>
          <Box sx={{ py: 3 }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

interface QuestoesPorBloco {
  portugues_bloco1: number[];
  portugues_bloco2: number[];
  matematica_bloco1: number[];
  matematica_bloco2: number[];
}

const SAEBV2SimuladosPage: React.FC = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [simulados, setSimulados] = useState<SimuladoSAEB[]>([]);
  const [questoes, setQuestoes] = useState<QuestaoSAEB[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSAEB[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSimulado, setEditingSimulado] = useState<SimuladoSAEB | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    ano_escolar: 5,
    ano_letivo: new Date().getFullYear(),
    status: StatusSimulado.RASCUNHO,
  });

  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<QuestoesPorBloco>({
    portugues_bloco1: [],
    portugues_bloco2: [],
    matematica_bloco1: [],
    matematica_bloco2: [],
  });

  useEffect(() => {
    loadSimulados();
    loadQuestoes();
    loadConfiguracoes();
  }, []);

  const loadSimulados = async () => {
    try {
      setLoading(true);
      const response = await saebV2API.listSimulados();
      setSimulados(response.data);
    } catch (error) {
      showNotification('Erro ao carregar simulados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestoes = async () => {
    try {
      const response = await saebV2API.listQuestoes();
      setQuestoes(response.data);
    } catch (error) {
      showNotification('Erro ao carregar questões', 'error');
    }
  };

  const loadConfiguracoes = async () => {
    try {
      const response = await saebV2API.listConfiguracoes();
      setConfiguracoes(response.data);
    } catch (error) {
      showNotification('Erro ao carregar configurações', 'error');
    }
  };

  const getConfiguracao = (anoEscolar: number): ConfiguracaoSAEB | undefined => {
    return configuracoes.find((c) => c.ano_escolar === anoEscolar);
  };

  const handleSave = async () => {
    try {
      const allQuestoes = [
        ...questoesSelecionadas.portugues_bloco1,
        ...questoesSelecionadas.portugues_bloco2,
        ...questoesSelecionadas.matematica_bloco1,
        ...questoesSelecionadas.matematica_bloco2,
      ];

      const dataToSend: any = {
        ...form,
        questoes_ids: allQuestoes,
      };

      if (editingSimulado) {
        await saebV2API.updateSimulado(editingSimulado.id, dataToSend);
        showNotification('Simulado atualizado com sucesso!', 'success');
      } else {
        await saebV2API.createSimulado(dataToSend);
        showNotification('Simulado criado com sucesso!', 'success');
      }
      setDialogOpen(false);
      loadSimulados();
      resetForm();
    } catch (error: any) {
      showNotification(error.response?.data?.detail || 'Erro ao salvar simulado', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      nome: '',
      descricao: '',
      ano_escolar: 5,
      ano_letivo: new Date().getFullYear(),
      status: StatusSimulado.RASCUNHO,
    });
    setQuestoesSelecionadas({
      portugues_bloco1: [],
      portugues_bloco2: [],
      matematica_bloco1: [],
      matematica_bloco2: [],
    });
    setEditingSimulado(null);
    setTabValue(0);
  };

  const openEdit = async (simulado: SimuladoSAEB) => {
    setEditingSimulado(simulado);

    try {
      const response = await saebV2API.getSimulado(simulado.id);
      if (response.data.questoes) {
        const questoesData = response.data.questoes;

        const newQuestoes: QuestoesPorBloco = {
          portugues_bloco1: questoesData
            .filter((q: any) => q.disciplina === 'portugues' && (q.bloco === 1 || q.bloco === '1'))
            .map((q: any) => q.id),
          portugues_bloco2: questoesData
            .filter((q: any) => q.disciplina === 'portugues' && (q.bloco === 2 || q.bloco === '2'))
            .map((q: any) => q.id),
          matematica_bloco1: questoesData
            .filter((q: any) => q.disciplina === 'matematica' && (q.bloco === 1 || q.bloco === '1'))
            .map((q: any) => q.id),
          matematica_bloco2: questoesData
            .filter((q: any) => q.disciplina === 'matematica' && (q.bloco === 2 || q.bloco === '2'))
            .map((q: any) => q.id),
        };
        setQuestoesSelecionadas(newQuestoes);
      }
    } catch (error) {
      console.error('Erro ao carregar questões do simulado:', error);
    }

    setForm({
      nome: simulado.nome,
      descricao: simulado.descricao || '',
      ano_escolar: simulado.ano_escolar,
      ano_letivo: simulado.ano_letivo,
      status: simulado.status,
    });
    setDialogOpen(true);
  };

  const toggleQuestao = (questaoId: number, disciplina: DisciplinaSAEB, bloco: BlocoSAEB) => {
    const key = `${disciplina}_bloco${bloco}` as keyof QuestoesPorBloco;
    const current = questoesSelecionadas[key];

    if (current.includes(questaoId)) {
      setQuestoesSelecionadas({
        ...questoesSelecionadas,
        [key]: current.filter((id) => id !== questaoId),
      });
    } else {
      setQuestoesSelecionadas({
        ...questoesSelecionadas,
        [key]: [...current, questaoId],
      });
    }
  };

  const getQuestoesByDisciplinaBloco = (disciplina: DisciplinaSAEB, bloco: BlocoSAEB) => {
    const filtered = questoes.filter(
      (q) =>
        String(q.disciplina) === String(disciplina) &&
        Number(q.bloco) === Number(bloco) &&
        q.ano_escolar === form.ano_escolar
    );
    return filtered;
  };

  const renderQuestaoSelector = (disciplina: DisciplinaSAEB, bloco: BlocoSAEB, label: string) => {
    const config = getConfiguracao(form.ano_escolar);
    const questoesRecomendadas = config?.questoes_por_bloco || 0;
    const key = `${disciplina}_bloco${bloco}` as keyof QuestoesPorBloco;
    const selecionadas = questoesSelecionadas[key].length;
    const questoesDisponiveis = getQuestoesByDisciplinaBloco(disciplina, bloco);

    const isValid = selecionadas === questoesRecomendadas;
    const isWarning = selecionadas > 0 && selecionadas !== questoesRecomendadas;
    const progress = questoesRecomendadas > 0 ? (selecionadas / questoesRecomendadas) * 100 : 0;

    return (
      <Zoom in timeout={300}>
        <Card
          sx={{
            mb: 3,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: isValid ? 'success.light' : isWarning ? 'warning.light' : 'divider',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {label}
              </Typography>
              <Chip
                label={`${selecionadas} / ${questoesRecomendadas}`}
                color={isValid ? 'success' : isWarning ? 'warning' : 'default'}
                icon={isValid ? <CheckIcon /> : isWarning ? <WarningIcon /> : undefined}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  height: 32,
                }}
              />
            </Box>

            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 100)}
              sx={{
                mb: 2,
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: isValid ? 'success.main' : isWarning ? 'warning.main' : 'primary.main',
                  borderRadius: 3,
                },
              }}
            />

            {questoesDisponiveis.length === 0 ? (
              <Alert
                severity="warning"
                sx={{ borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.light' }}
              >
                <Typography variant="body2">
                  Nenhuma questão cadastrada para este bloco. Por favor, cadastre questões primeiro.
                </Typography>
              </Alert>
            ) : (
              <Box
                sx={{
                  maxHeight: 320,
                  overflowY: 'auto',
                  px: 1,
                  '&::-webkit-scrollbar': {
                    width: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: 'action.hover',
                    borderRadius: 4,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'action.selected',
                    borderRadius: 4,
                    '&:hover': {
                      bgcolor: 'action.active',
                    },
                  },
                }}
              >
                {questoesDisponiveis.map((questao) => (
                  <Box
                    key={questao.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      p: 1.5,
                      mb: 1,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: questoesSelecionadas[key].includes(questao.id)
                        ? 'primary.main'
                        : 'transparent',
                      bgcolor: questoesSelecionadas[key].includes(questao.id)
                        ? 'primary.50'
                        : 'transparent',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: questoesSelecionadas[key].includes(questao.id)
                          ? 'primary.100'
                          : 'action.hover',
                        borderColor: questoesSelecionadas[key].includes(questao.id)
                          ? 'primary.main'
                          : 'action.selected',
                      },
                    }}
                  >
                    <Checkbox
                      checked={questoesSelecionadas[key].includes(questao.id)}
                      onChange={() => toggleQuestao(questao.id, disciplina, bloco)}
                      sx={{
                        '&.Mui-checked': {
                          color: 'primary.main',
                        },
                      }}
                    />
                    <Box flex={1} pt={0.75}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          mb: 0.5,
                        }}
                      >
                        Descritor {questao.descritor?.codigo}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: 'block',
                          mb: 0.5,
                          lineHeight: 1.5,
                        }}
                      >
                        {questao.descritor?.descricao}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.disabled',
                          fontStyle: 'italic',
                          display: 'block',
                          lineHeight: 1.4,
                        }}
                      >
                        {questao.enunciado.substring(0, 100)}...
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Zoom>
    );
  };

  const getTotalQuestoes = () => {
    return (
      questoesSelecionadas.portugues_bloco1.length +
      questoesSelecionadas.portugues_bloco2.length +
      questoesSelecionadas.matematica_bloco1.length +
      questoesSelecionadas.matematica_bloco2.length
    );
  };

  const isFormValid = () => {
    const config = getConfiguracao(form.ano_escolar);
    if (!config) return false;

    const expected = config.questoes_por_bloco;
    return (
      form.nome.trim() !== '' &&
      questoesSelecionadas.portugues_bloco1.length === expected &&
      questoesSelecionadas.portugues_bloco2.length === expected &&
      questoesSelecionadas.matematica_bloco1.length === expected &&
      questoesSelecionadas.matematica_bloco2.length === expected
    );
  };

  return (
    <MainLayout title="SAEB V2 - Simulados">
      <Box sx={{ width: '100%', height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <SchoolIcon sx={{ fontSize: 36, color: 'primary.main' }} />
              Gerenciar Simulados SAEB
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crie e gerencie simulados com questões de Português e Matemática
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/saeb-v2/dashboard')}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
              }}
            >
              Dashboard
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Novo Simulado
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={8}>
            <CircularProgress size={48} />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.50' }}>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Ano Escolar</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Ano Letivo</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Questões</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {simulados.map((simulado) => (
                  <TableRow
                    key={simulado.id}
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{simulado.nome}</TableCell>
                    <TableCell>{simulado.ano_escolar}º ano</TableCell>
                    <TableCell>{simulado.ano_letivo}</TableCell>
                    <TableCell>
                      <Chip
                        label={simulado.total_questoes || 0}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={simulado.status}
                        size="small"
                        color={simulado.status === StatusSimulado.PUBLICADO || simulado.status === StatusSimulado.EM_ANDAMENTO ? 'success' : 'default'}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openEdit(simulado)}
                          title="Editar Simulado"
                          sx={{
                            '&:hover': {
                              bgcolor: 'primary.50',
                            },
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => navigate(`/saeb-v2/simulados/${simulado.id}/questoes`)}
                          title="Gerenciar Questões"
                          sx={{
                            '&:hover': {
                              bgcolor: 'secondary.50',
                            },
                          }}
                        >
                          <QuestoesIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => navigate(`/saeb-v2/simulados/${simulado.id}/analise`)}
                          title="Análise Psicométrica"
                          sx={{
                            '&:hover': {
                              bgcolor: 'info.50',
                            },
                          }}
                        >
                          <AnaliseIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {simulados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum simulado cadastrado. Clique em "Novo Simulado" para começar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: 'primary.50',
              borderBottom: '1px solid',
              borderColor: 'divider',
              py: 2.5,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {editingSimulado ? 'Editar Simulado' : 'Novo Simulado'}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 2 }}>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Nome do Simulado"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                sx={{ mb: 3 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />

              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                sx={{ mb: 3 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Ano Escolar</InputLabel>
                    <Select
                      value={form.ano_escolar}
                      label="Ano Escolar"
                      onChange={(e) => {
                        setForm({ ...form, ano_escolar: e.target.value as number });
                        setQuestoesSelecionadas({
                          portugues_bloco1: [],
                          portugues_bloco2: [],
                          matematica_bloco1: [],
                          matematica_bloco2: [],
                        });
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value={5}>5º Ano</MenuItem>
                      <MenuItem value={9}>9º Ano</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ano Letivo"
                    type="number"
                    value={form.ano_letivo}
                    onChange={(e) => setForm({ ...form, ano_letivo: parseInt(e.target.value) })}
                    InputProps={{
                      sx: { borderRadius: 2 },
                    }}
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) => setForm({ ...form, status: e.target.value as StatusSimulado })}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value={StatusSimulado.RASCUNHO}>Rascunho</MenuItem>
                  <MenuItem value={StatusSimulado.PUBLICADO}>Publicado</MenuItem>
                  {form.status === StatusSimulado.EM_ANDAMENTO && (
                    <MenuItem value={StatusSimulado.EM_ANDAMENTO} disabled>Em Andamento (automático)</MenuItem>
                  )}
                  <MenuItem 
                    value={StatusSimulado.ENCERRADO}
                    disabled={form.status === StatusSimulado.RASCUNHO}
                  >
                    Encerrado {form.status === StatusSimulado.ENCERRADO ? '(pode ser automático)' : ''}
                  </MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 3 }} />

              <Alert
                severity="info"
                icon={<SchoolIcon />}
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: 'info.50',
                  border: '1px solid',
                  borderColor: 'info.light',
                }}
              >
                <Typography variant="body2">
                  Selecione <strong>{getConfiguracao(form.ano_escolar)?.questoes_por_bloco || 0} questões</strong>{' '}
                  para cada bloco. Total esperado:{' '}
                  <strong>{(getConfiguracao(form.ano_escolar)?.questoes_por_bloco || 0) * 4} questões</strong>
                </Typography>
              </Alert>

              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                sx={{
                  mb: 2,
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: '1rem',
                    textTransform: 'none',
                    minHeight: 56,
                  },
                }}
              >
                <Tab
                  icon={<BookIcon />}
                  iconPosition="start"
                  label="Português"
                  sx={{ flex: 1 }}
                />
                <Tab
                  icon={<CalculateIcon />}
                  iconPosition="start"
                  label="Matemática"
                  sx={{ flex: 1 }}
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {renderQuestaoSelector(DisciplinaSAEB.PORTUGUES, BlocoSAEB.BLOCO_1, 'Bloco 1')}
                {renderQuestaoSelector(DisciplinaSAEB.PORTUGUES, BlocoSAEB.BLOCO_2, 'Bloco 2')}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {renderQuestaoSelector(DisciplinaSAEB.MATEMATICA, BlocoSAEB.BLOCO_1, 'Bloco 1')}
                {renderQuestaoSelector(DisciplinaSAEB.MATEMATICA, BlocoSAEB.BLOCO_2, 'Bloco 2')}
              </TabPanel>

              <Paper
                sx={{
                  mt: 3,
                  p: 2.5,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Total de questões selecionadas
                  </Typography>
                  <Chip
                    label={`${getTotalQuestoes()} / ${(getConfiguracao(form.ano_escolar)?.questoes_por_bloco || 0) * 4}`}
                    color={isFormValid() ? 'success' : 'default'}
                    sx={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      height: 36,
                      px: 1,
                    }}
                  />
                </Box>
              </Paper>
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              py: 2.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Button
              onClick={() => setDialogOpen(false)}
              sx={{
                borderRadius: 2,
                px: 3,
                fontWeight: 600,
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!isFormValid()}
              sx={{
                borderRadius: 2,
                px: 4,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                },
              }}
            >
              Salvar Simulado
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default SAEBV2SimuladosPage;
