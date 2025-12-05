/**
 * SAEB V2 - Gerenciar Questões do Simulado
 * Permite adicionar e remover questões de um simulado específico
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowBack as BackIcon,
  DragIndicator as DragIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import { SimuladoSAEB, SimuladoQuestao, QuestaoSAEB, DisciplinaSAEB, BlocoSAEB } from '../types';

const SAEBV2GerenciarQuestoesPage: React.FC = () => {
  const { simuladoId } = useParams<{ simuladoId: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [simulado, setSimulado] = useState<SimuladoSAEB | null>(null);
  const [questoesSimulado, setQuestoesSimulado] = useState<SimuladoQuestao[]>([]);
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<QuestaoSAEB[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroDisciplina, setFiltroDisciplina] = useState<DisciplinaSAEB | 'todas'>('todas');
  const [filtroBloco, setFiltroBloco] = useState<BlocoSAEB | 'todos'>('todos');

  // Limites de questões por bloco (5º ano: 11, 9º ano: 13)
  const getQuestoesPorBloco = (anoEscolar: number) => anoEscolar === 5 ? 11 : 13;

  // Contagem de questões por disciplina e bloco
  const getContagemPorBlocoEDisciplina = () => {
    const contagem = {
      portugues: { bloco1: 0, bloco2: 0 },
      matematica: { bloco1: 0, bloco2: 0 }
    };
    
    questoesSimulado.forEach(sq => {
      if (sq.questao) {
        const disc = sq.questao.disciplina === 'portugues' ? 'portugues' : 'matematica';
        const bloco = Number(sq.questao.bloco) === 1 ? 'bloco1' : 'bloco2';
        contagem[disc][bloco]++;
      }
    });
    
    return contagem;
  };

  useEffect(() => {
    if (simuladoId) {
      loadData();
    }
  }, [simuladoId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar simulado
      const simuladoResponse = await saebV2API.getSimulado(Number(simuladoId));
      setSimulado(simuladoResponse.data);

      // Carregar questões do simulado
      const questoesResponse = await saebV2API.getSimuladoQuestoes(Number(simuladoId));
      setQuestoesSimulado(questoesResponse.data);

      // Carregar todas as questões disponíveis (apenas ativas e do mesmo ano escolar)
      const todasQuestoesResponse = await saebV2API.listQuestoes({ 
        ativo: true,
        ano_escolar: simuladoResponse.data.ano_escolar 
      });
      setQuestoesDisponiveis(todasQuestoesResponse.data);
    } catch (error) {
      showNotification('Erro ao carregar dados', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarQuestao = async (questaoId: number) => {
    try {
      await saebV2API.adicionarQuestaoSimulado(Number(simuladoId), questaoId);
      showNotification('Questão adicionada com sucesso!', 'success');
      await loadData();
      // Mantém o modal aberto para permitir adicionar várias questões
    } catch (error: any) {
      const mensagem = error.response?.data?.detail || 'Erro ao adicionar questão';
      showNotification(mensagem, 'error');
    }
  };

  const handleRemoverQuestao = async (simuladoQuestaoId: number) => {
    if (!window.confirm('Tem certeza que deseja remover esta questão do simulado?')) {
      return;
    }

    try {
      await saebV2API.removerQuestaoSimulado(Number(simuladoId), simuladoQuestaoId);
      showNotification('Questão removida com sucesso!', 'success');
      await loadData();
    } catch (error) {
      showNotification('Erro ao remover questão', 'error');
    }
  };

  const questoesFiltradas = questoesDisponiveis.filter((q) => {
    if (filtroDisciplina !== 'todas' && q.disciplina !== filtroDisciplina) return false;
    // Comparar bloco convertendo para número, pois o Select retorna string
    if (filtroBloco !== 'todos' && q.bloco !== Number(filtroBloco)) return false;
    // Não mostrar questões já adicionadas
    const jaAdicionada = questoesSimulado.some((sq) => sq.questao?.id === q.id);
    return !jaAdicionada;
  });

  const getDisciplinaLabel = (disciplina: DisciplinaSAEB | string) => {
    return disciplina === 'portugues' || disciplina === DisciplinaSAEB.PORTUGUES ? 'Português' : 'Matemática';
  };

  if (loading) {
    return (
      <Box>
        <AppBarWithUserMenu title="Gerenciar Questões" showBackButton />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!simulado) {
    return (
      <Box>
        <AppBarWithUserMenu title="Gerenciar Questões" showBackButton />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">Simulado não encontrado</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppBarWithUserMenu title={`Gerenciar Questões - ${simulado.nome}`} showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header Actions */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/saeb-v2/simulados')}
          >
            Voltar para Simulados
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Adicionar Questão
          </Button>
        </Box>

        {/* Info Card */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Simulado:
              </Typography>
              <Typography variant="h6">{simulado.nome}</Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                Ano Escolar:
              </Typography>
              <Typography variant="h6">{simulado.ano_escolar}º ano</Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                Total de Questões:
              </Typography>
              <Typography variant="h6" color="primary">
                {questoesSimulado.length} / {getQuestoesPorBloco(simulado.ano_escolar) * 4}
              </Typography>
            </Grid>
          </Grid>
          
          {/* Progresso por disciplina e bloco */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Progresso por Disciplina e Bloco (máx: {getQuestoesPorBloco(simulado.ano_escolar)} questões/bloco)
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {(() => {
                const contagem = getContagemPorBlocoEDisciplina();
                const limite = getQuestoesPorBloco(simulado.ano_escolar);
                return (
                  <>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`Português B1: ${contagem.portugues.bloco1}/${limite}`}
                        color={contagem.portugues.bloco1 >= limite ? 'success' : 'default'}
                        variant={contagem.portugues.bloco1 >= limite ? 'filled' : 'outlined'}
                        size="small"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`Português B2: ${contagem.portugues.bloco2}/${limite}`}
                        color={contagem.portugues.bloco2 >= limite ? 'success' : 'default'}
                        variant={contagem.portugues.bloco2 >= limite ? 'filled' : 'outlined'}
                        size="small"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`Matemática B1: ${contagem.matematica.bloco1}/${limite}`}
                        color={contagem.matematica.bloco1 >= limite ? 'success' : 'default'}
                        variant={contagem.matematica.bloco1 >= limite ? 'filled' : 'outlined'}
                        size="small"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Chip
                        label={`Matemática B2: ${contagem.matematica.bloco2}/${limite}`}
                        color={contagem.matematica.bloco2 >= limite ? 'success' : 'default'}
                        variant={contagem.matematica.bloco2 >= limite ? 'filled' : 'outlined'}
                        size="small"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                  </>
                );
              })()}
            </Grid>
          </Box>
        </Paper>

        {/* Questões Table */}
        <Paper>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">Questões do Simulado</Typography>
            <Typography variant="body2" color="text.secondary">
              Lista de questões ordenadas conforme aparecerão no simulado
            </Typography>
          </Box>

          {questoesSimulado.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Nenhuma questão adicionada ao simulado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clique em "Adicionar Questão" para começar
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="5%">Ordem</TableCell>
                    <TableCell width="8%">Status</TableCell>
                    <TableCell width="10%">Disciplina</TableCell>
                    <TableCell width="8%">Bloco</TableCell>
                    <TableCell>Enunciado</TableCell>
                    <TableCell width="12%">Descritor</TableCell>
                    <TableCell width="8%" align="center">
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {questoesSimulado.map((sq, index) => {
                    const isInativa = sq.questao && sq.questao.ativo === false;
                    const isRemovida = !sq.questao || (sq as any).questao_removida;
                    const hasProblema = isInativa || isRemovida;
                    
                    return (
                      <TableRow 
                        key={sq.id} 
                        hover
                        sx={{
                          backgroundColor: hasProblema ? 'rgba(255, 152, 0, 0.1)' : 'inherit',
                          '&:hover': {
                            backgroundColor: hasProblema ? 'rgba(255, 152, 0, 0.2)' : undefined,
                          }
                        }}
                      >
                        <TableCell>
                          <Chip label={index + 1} size="small" color="primary" />
                        </TableCell>
                        <TableCell>
                          {isRemovida ? (
                            <Tooltip title="Esta questão foi excluída do banco de questões. Remova-a do simulado.">
                              <Chip
                                icon={<BlockIcon />}
                                label="Excluída"
                                size="small"
                                color="error"
                              />
                            </Tooltip>
                          ) : isInativa ? (
                            <Tooltip title="Esta questão foi inativada no banco de questões. Considere removê-la do simulado.">
                              <Chip
                                icon={<WarningIcon />}
                                label="Inativa"
                                size="small"
                                color="warning"
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              label="Ativa"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isRemovida ? (
                            <Typography variant="body2" color="text.disabled">-</Typography>
                          ) : (
                            <Chip
                              label={getDisciplinaLabel(sq.questao?.disciplina || DisciplinaSAEB.PORTUGUES)}
                              size="small"
                              color={sq.questao?.disciplina === 'portugues' ? 'info' : 'warning'}
                              sx={{ opacity: isInativa ? 0.6 : 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isRemovida ? (
                            <Typography variant="body2" color="text.disabled">-</Typography>
                          ) : (
                            <Chip 
                              label={`Bloco ${sq.questao?.bloco}`} 
                              size="small" 
                              variant="outlined"
                              sx={{ opacity: isInativa ? 0.6 : 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {isRemovida ? (
                            <Typography variant="body2" color="error" fontStyle="italic">
                              Questão excluída do banco de dados
                            </Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: isInativa ? 0.6 : 1,
                                textDecoration: isInativa ? 'line-through' : 'none',
                              }}
                            >
                              {sq.questao?.enunciado}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {isRemovida ? (
                            <Typography variant="body2" color="text.disabled">-</Typography>
                          ) : (
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ opacity: isInativa ? 0.6 : 1 }}
                            >
                              {sq.questao?.descritor?.codigo}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={hasProblema ? "Remover questão problemática" : "Remover questão"}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoverQuestao(sq.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Dialog para adicionar questão */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Adicionar Questão ao Simulado</DialogTitle>
          <DialogContent>
            {/* Filtros */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Disciplina</InputLabel>
                <Select
                  value={filtroDisciplina}
                  label="Disciplina"
                  onChange={(e) => setFiltroDisciplina(e.target.value as DisciplinaSAEB | 'todas')}
                >
                  <MenuItem value="todas">Todas</MenuItem>
                  <MenuItem value="portugues">Português</MenuItem>
                  <MenuItem value="matematica">Matemática</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Bloco</InputLabel>
                <Select
                  value={filtroBloco}
                  label="Bloco"
                  onChange={(e) => setFiltroBloco(e.target.value as BlocoSAEB | 'todos')}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="1">Bloco 1</MenuItem>
                  <MenuItem value="2">Bloco 2</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Contador de questões encontradas */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>{questoesFiltradas.length}</strong> questão(ões) encontrada(s)
                {filtroDisciplina !== 'todas' || filtroBloco !== 'todos' ? ' com os filtros aplicados' : ''}
              </Typography>
            </Box>

            {/* Lista de questões disponíveis */}
            {questoesFiltradas.length === 0 ? (
              <Alert severity="info">
                Nenhuma questão disponível com os filtros selecionados ou todas as questões já foram adicionadas.
              </Alert>
            ) : (
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Disciplina</TableCell>
                      <TableCell>Bloco</TableCell>
                      <TableCell>Enunciado</TableCell>
                      <TableCell>Descritor</TableCell>
                      <TableCell align="center">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {questoesFiltradas.map((questao) => (
                      <TableRow key={questao.id} hover>
                        <TableCell>
                          <Chip
                            label={getDisciplinaLabel(questao.disciplina)}
                            size="small"
                            color={questao.disciplina === 'portugues' ? 'info' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={`Bloco ${questao.bloco}`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {questao.enunciado}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {questao.descritor?.codigo}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleAdicionarQuestao(questao.id)}
                          >
                            Adicionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default SAEBV2GerenciarQuestoesPage;
