/**
 * SAEB V2 - Descritores e Questões Management
 * Gestão Municipal interface to manage descriptors and questions
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
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
  CircularProgress,
  Grid,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Upload as UploadIcon,
  GetApp as DownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import { useFilteredData } from '../hooks/useFilteredData';
import {
  DescritorSAEB,
  QuestaoSAEB,
  DisciplinaSAEB,
  BlocoSAEB,
  DescritorSAEBCreate,
  QuestaoSAEBCreate,
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

const SAEBV2DescritoresPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Descritores state
  const [descritores, setDescritores] = useState<DescritorSAEB[]>([]);
  const [descritorDialogOpen, setDescritorDialogOpen] = useState(false);
  const [editingDescritor, setEditingDescritor] = useState<DescritorSAEB | null>(null);
  const [descritorForm, setDescritorForm] = useState<DescritorSAEBCreate>({
    disciplina: DisciplinaSAEB.PORTUGUES,
    ano_escolar: 5,
    codigo: '',
    descricao: '',
  });
  const [importing, setImporting] = useState(false);
  const [importingQuestoes, setImportingQuestoes] = useState(false);

  // Filtros de Descritores
  const [descritorSearch, setDescritorSearch] = useState('');
  const [descritorDisciplinaFilter, setDescritorDisciplinaFilter] = useState<string>('');
  const [descritorAnoFilter, setDescritorAnoFilter] = useState<string>('');

  // Questões state
  const [questoes, setQuestoes] = useState<QuestaoSAEB[]>([]);
  const [questaoDialogOpen, setQuestaoDialogOpen] = useState(false);
  const [editingQuestao, setEditingQuestao] = useState<QuestaoSAEB | null>(null);
  const [questaoForm, setQuestaoForm] = useState<QuestaoSAEBCreate>({
    descritor_id: 0,
    enunciado: '',
    disciplina: DisciplinaSAEB.PORTUGUES,
    bloco: BlocoSAEB.BLOCO_1,
    ano_escolar: 5,
    alternativa_a: '',
    alternativa_b: '',
    alternativa_c: '',
    alternativa_d: '',
    alternativa_e: '',
    gabarito: 'A',
  });

  // Filtros de Questões
  const [questaoSearch, setQuestaoSearch] = useState('');
  const [questaoDisciplinaFilter, setQuestaoDisciplinaFilter] = useState<string>('');
  const [questaoAnoFilter, setQuestaoAnoFilter] = useState<string>('');
  const [questaoBlocoFilter, setQuestaoBlocoFilter] = useState<string>('');

  // Descritores filtrados
  const filteredDescritores = descritores.filter((desc) => {
    const matchesSearch = descritorSearch === '' || 
      desc.codigo.toLowerCase().includes(descritorSearch.toLowerCase()) ||
      desc.descricao.toLowerCase().includes(descritorSearch.toLowerCase());
    const matchesDisciplina = descritorDisciplinaFilter === '' || desc.disciplina === descritorDisciplinaFilter;
    const matchesAno = descritorAnoFilter === '' || desc.ano_escolar === Number(descritorAnoFilter);
    return matchesSearch && matchesDisciplina && matchesAno;
  });

  // Aplica busca contextual do header sobre os descritores já filtrados
  const contextualFilteredDescritores = useFilteredData(filteredDescritores, ['codigo', 'descricao']);

  // Questões filtradas
  const filteredQuestoes = questoes.filter((q) => {
    const matchesSearch = questaoSearch === '' || 
      q.enunciado.toLowerCase().includes(questaoSearch.toLowerCase()) ||
      (q.descritor?.codigo && q.descritor.codigo.toLowerCase().includes(questaoSearch.toLowerCase()));
    const matchesDisciplina = questaoDisciplinaFilter === '' || q.disciplina === questaoDisciplinaFilter;
    const matchesAno = questaoAnoFilter === '' || q.ano_escolar === Number(questaoAnoFilter);
    const matchesBloco = questaoBlocoFilter === '' || q.bloco === Number(questaoBlocoFilter);
    return matchesSearch && matchesDisciplina && matchesAno && matchesBloco;
  });

  // Aplica busca contextual do header sobre as questões já filtradas
  const contextualFilteredQuestoes = useFilteredData(filteredQuestoes, ['enunciado', 'gabarito']);

  const clearDescritorFilters = () => {
    setDescritorSearch('');
    setDescritorDisciplinaFilter('');
    setDescritorAnoFilter('');
  };

  const clearQuestaoFilters = () => {
    setQuestaoSearch('');
    setQuestaoDisciplinaFilter('');
    setQuestaoAnoFilter('');
    setQuestaoBlocoFilter('');
  };

  useEffect(() => {
    loadDescritores();
    loadQuestoes();
  }, []);

  const loadDescritores = async () => {
    try {
      setLoading(true);
      const response = await saebV2API.listDescritores();
      setDescritores(response.data);
    } catch (error) {
      showNotification('Erro ao carregar descritores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestoes = async () => {
    try {
      const response = await saebV2API.listQuestoes({ ativo: true, limit: 1000 });
      console.log('Questões carregadas (descritores page):', response.data?.length || 0);
      setQuestoes(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
      showNotification('Erro ao carregar questões', 'error');
    }
  };

  const handleSaveDescritor = async () => {
    try {
      if (editingDescritor) {
        await saebV2API.updateDescritor(editingDescritor.id, descritorForm);
        showNotification('Descritor atualizado com sucesso', 'success');
      } else {
        await saebV2API.createDescritor(descritorForm);
        showNotification('Descritor criado com sucesso', 'success');
      }
      setDescritorDialogOpen(false);
      loadDescritores();
      resetDescritorForm();
    } catch (error: any) {
      showNotification(error.response?.data?.detail || 'Erro ao salvar descritor', 'error');
    }
  };

  const handleDeleteDescritor = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este descritor?')) return;
    try {
      await saebV2API.deleteDescritor(id);
      showNotification('Descritor excluído com sucesso', 'success');
      loadDescritores();
    } catch (error) {
      showNotification('Erro ao excluir descritor', 'error');
    }
  };

  const handleSaveQuestao = async () => {
    try {
      if (editingQuestao) {
        await saebV2API.updateQuestao(editingQuestao.id, questaoForm);
        showNotification('Questão atualizada com sucesso', 'success');
      } else {
        await saebV2API.createQuestao(questaoForm);
        showNotification('Questão criada com sucesso', 'success');
      }
      setQuestaoDialogOpen(false);
      loadQuestoes();
      resetQuestaoForm();
    } catch (error: any) {
      showNotification(error.response?.data?.detail || 'Erro ao salvar questão', 'error');
    }
  };

  const handleDeleteQuestao = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir esta questão?')) return;
    try {
      await saebV2API.deleteQuestao(id);
      showNotification('Questão excluída com sucesso', 'success');
      loadQuestoes();
    } catch (error) {
      showNotification('Erro ao excluir questão', 'error');
    }
  };

  const handleImportDescritores = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar extensão do arquivo
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showNotification('Apenas arquivos Excel (.xlsx, .xls) são permitidos', 'error');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await saebV2API.importDescritores(formData);

      const { total, sucesso, falha, duplicados } = response.data;

      if (sucesso > 0) {
        showNotification(
          `Importação concluída: ${sucesso} descritores importados${duplicados > 0 ? `, ${duplicados} duplicados ignorados` : ''}${falha > 0 ? `, ${falha} com erro` : ''}`,
          sucesso === total ? 'success' : 'warning'
        );
        loadDescritores();
      } else {
        showNotification(
          `Nenhum descritor importado. ${duplicados} duplicados, ${falha} com erro.`,
          'error'
        );
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.detail || 'Erro ao importar descritores',
        'error'
      );
    } finally {
      setImporting(false);
      // Reset input file
      event.target.value = '';
    }
  };

  const handleImportQuestoes = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar extensão do arquivo
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showNotification('Apenas arquivos Excel (.xlsx, .xls) são permitidos', 'error');
      return;
    }

    setImportingQuestoes(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await saebV2API.importQuestoes(formData);

      const { total, sucesso, falha, erros } = response.data;

      if (sucesso > 0) {
        showNotification(
          `Importação concluída: ${sucesso} questões importadas${falha > 0 ? `, ${falha} com erro` : ''}`,
          sucesso === total ? 'success' : 'warning'
        );
        loadQuestoes();
      } else {
        showNotification(
          `Nenhuma questão importada. ${falha} com erro.`,
          'error'
        );
        if (erros && erros.length > 0) {
          console.error('Erros de importação:', erros);
        }
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.detail || 'Erro ao importar questões',
        'error'
      );
    } finally {
      setImportingQuestoes(false);
      // Reset input file
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await saebV2API.downloadTemplateDescritores();

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_descritores_saeb.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showNotification('Erro ao baixar template', 'error');
    }
  };

  const resetDescritorForm = () => {
    setDescritorForm({
      disciplina: DisciplinaSAEB.PORTUGUES,
      ano_escolar: 5,
      codigo: '',
      descricao: '',
    });
    setEditingDescritor(null);
  };

  const resetQuestaoForm = () => {
    setQuestaoForm({
      descritor_id: 0,
      enunciado: '',
      disciplina: DisciplinaSAEB.PORTUGUES,
      bloco: BlocoSAEB.BLOCO_1,
      ano_escolar: 5,
      alternativa_a: '',
      alternativa_b: '',
      alternativa_c: '',
      alternativa_d: '',
      alternativa_e: '',
      gabarito: 'A',
    });
    setEditingQuestao(null);
  };

  const openEditDescritor = (descritor: DescritorSAEB) => {
    setEditingDescritor(descritor);
    setDescritorForm({
      disciplina: descritor.disciplina,
      ano_escolar: descritor.ano_escolar,
      codigo: descritor.codigo,
      descricao: descritor.descricao,
    });
    setDescritorDialogOpen(true);
  };

  const openEditQuestao = (questao: QuestaoSAEB) => {
    setEditingQuestao(questao);
    setQuestaoForm({
      descritor_id: questao.descritor_id,
      enunciado: questao.enunciado,
      disciplina: questao.disciplina,
      bloco: questao.bloco,
      ano_escolar: questao.ano_escolar,
      alternativa_a: questao.alternativa_a,
      alternativa_b: questao.alternativa_b,
      alternativa_c: questao.alternativa_c,
      alternativa_d: questao.alternativa_d,
      alternativa_e: questao.alternativa_e,
      gabarito: questao.gabarito || 'A',
    });
    setQuestaoDialogOpen(true);
  };

  return (
    <MainLayout title="SAEB V2 - Descritores e Questões">
      <Box sx={{ width: '100%', height: '100%' }}>
        <Paper sx={{ p: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Descritores" />
            <Tab label="Questões" />
          </Tabs>

          {/* Descritores Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Gerenciar Descritores</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                >
                  Baixar Template
                </Button>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={importing}
                >
                  {importing ? 'Importando...' : 'Importar Excel'}
                  <input
                    type="file"
                    hidden
                    accept=".xlsx,.xls"
                    onChange={handleImportDescritores}
                  />
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetDescritorForm();
                    setDescritorDialogOpen(true);
                  }}
                >
                  Novo Descritor
                </Button>
              </Box>
            </Box>

            {/* Filtros de Descritores */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Pesquisar por código ou descrição..."
                    value={descritorSearch}
                    onChange={(e) => setDescritorSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Disciplina</InputLabel>
                    <Select
                      value={descritorDisciplinaFilter}
                      label="Disciplina"
                      onChange={(e) => setDescritorDisciplinaFilter(e.target.value)}
                    >
                      <MenuItem value="">Todas</MenuItem>
                      <MenuItem value={DisciplinaSAEB.PORTUGUES}>Português</MenuItem>
                      <MenuItem value={DisciplinaSAEB.MATEMATICA}>Matemática</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ano Escolar</InputLabel>
                    <Select
                      value={descritorAnoFilter}
                      label="Ano Escolar"
                      onChange={(e) => setDescritorAnoFilter(e.target.value)}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value="5">5º Ano</MenuItem>
                      <MenuItem value="9">9º Ano</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={clearDescritorFilters}
                    fullWidth
                  >
                    Limpar Filtros
                  </Button>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" color="text.secondary">
                    {contextualFilteredDescritores.length} de {descritores.length} descritores
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Disciplina</TableCell>
                      <TableCell>Ano</TableCell>
                      <TableCell>Código</TableCell>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contextualFilteredDescritores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                            {descritores.length === 0
                              ? 'Nenhum descritor cadastrado'
                              : 'Nenhum descritor encontrado com os filtros aplicados'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contextualFilteredDescritores.map((desc) => (
                      <TableRow key={desc.id}>
                        <TableCell>
                          <Chip
                            label={desc.disciplina === DisciplinaSAEB.PORTUGUES ? 'Português' : 'Matemática'}
                            color={desc.disciplina === DisciplinaSAEB.PORTUGUES ? 'primary' : 'secondary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${desc.ano_escolar}º Ano`}
                            color={desc.ano_escolar === 5 ? 'success' : 'info'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={desc.codigo} variant="outlined" size="small" />
                        </TableCell>
                        <TableCell>{desc.descricao}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => openEditDescritor(desc)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteDescritor(desc.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )))
                    }
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Questões Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Gerenciar Questões</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={importingQuestoes}
                >
                  {importingQuestoes ? 'Importando...' : 'Importar Questões'}
                  <input
                    type="file"
                    hidden
                    accept=".xlsx,.xls"
                    onChange={handleImportQuestoes}
                  />
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetQuestaoForm();
                    setQuestaoDialogOpen(true);
                  }}
                >
                  Nova Questão
                </Button>
              </Box>
            </Box>

            {/* Filtros de Questões */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Pesquisar por enunciado ou descritor..."
                    value={questaoSearch}
                    onChange={(e) => setQuestaoSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Disciplina</InputLabel>
                    <Select
                      value={questaoDisciplinaFilter}
                      label="Disciplina"
                      onChange={(e) => setQuestaoDisciplinaFilter(e.target.value)}
                    >
                      <MenuItem value="">Todas</MenuItem>
                      <MenuItem value={DisciplinaSAEB.PORTUGUES}>Português</MenuItem>
                      <MenuItem value={DisciplinaSAEB.MATEMATICA}>Matemática</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ano Escolar</InputLabel>
                    <Select
                      value={questaoAnoFilter}
                      label="Ano Escolar"
                      onChange={(e) => setQuestaoAnoFilter(e.target.value)}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value="5">5º Ano</MenuItem>
                      <MenuItem value="9">9º Ano</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Bloco</InputLabel>
                    <Select
                      value={questaoBlocoFilter}
                      label="Bloco"
                      onChange={(e) => setQuestaoBlocoFilter(e.target.value)}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value={BlocoSAEB.BLOCO_1}>Bloco 1</MenuItem>
                      <MenuItem value={BlocoSAEB.BLOCO_2}>Bloco 2</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={clearQuestaoFilters}
                    fullWidth
                    size="small"
                  >
                    Limpar
                  </Button>
                </Grid>
                <Grid item xs={12} md={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    {contextualFilteredQuestoes.length} de {questoes.length}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Enunciado</TableCell>
                    <TableCell>Descritor</TableCell>
                    <TableCell>Disciplina</TableCell>
                    <TableCell>Bloco</TableCell>
                    <TableCell>Ano</TableCell>
                    <TableCell>Gabarito</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contextualFilteredQuestoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          {questoes.length === 0
                            ? 'Nenhuma questão cadastrada'
                            : 'Nenhuma questão encontrada com os filtros aplicados'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    contextualFilteredQuestoes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>{q.id}</TableCell>
                      <TableCell>{q.enunciado.substring(0, 50)}...</TableCell>
                      <TableCell>
                        <Chip
                          label={q.descritor ? q.descritor.codigo : `ID ${q.descritor_id}`}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={q.disciplina === DisciplinaSAEB.PORTUGUES ? 'Português' : 'Matemática'}
                          size="small"
                          color={q.disciplina === DisciplinaSAEB.PORTUGUES ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>Bloco {q.bloco}</TableCell>
                      <TableCell>{q.ano_escolar}º ano</TableCell>
                      <TableCell>
                        <Chip label={q.gabarito} size="small" color="success" />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openEditQuestao(q)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteQuestao(q.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )))
                  }
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Paper>
      </Box>

      {/* Descritor Dialog */}
      <Dialog open={descritorDialogOpen} onClose={() => setDescritorDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDescritor ? 'Editar Descritor' : 'Novo Descritor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Disciplina</InputLabel>
              <Select
                value={descritorForm.disciplina}
                label="Disciplina"
                onChange={(e) => setDescritorForm({ ...descritorForm, disciplina: e.target.value as DisciplinaSAEB })}
              >
                <MenuItem value={DisciplinaSAEB.PORTUGUES}>Língua Portuguesa</MenuItem>
                <MenuItem value={DisciplinaSAEB.MATEMATICA}>Matemática</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Ano Escolar</InputLabel>
              <Select
                value={descritorForm.ano_escolar}
                label="Ano Escolar"
                onChange={(e) => setDescritorForm({ ...descritorForm, ano_escolar: Number(e.target.value) })}
              >
                <MenuItem value={5}>5º Ano</MenuItem>
                <MenuItem value={9}>9º Ano</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Código"
              value={descritorForm.codigo}
              onChange={(e) => setDescritorForm({ ...descritorForm, codigo: e.target.value })}
              fullWidth
              helperText="Ex: D1, D2, D3..."
            />
            <TextField
              label="Descrição"
              value={descritorForm.descricao}
              onChange={(e) => setDescritorForm({ ...descritorForm, descricao: e.target.value })}
              multiline
              rows={4}
              fullWidth
              helperText="Descrição completa do descritor (pode ser reutilizado em várias questões)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescritorDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveDescritor} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Questão Dialog */}
      <Dialog open={questaoDialogOpen} onClose={() => setQuestaoDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingQuestao ? 'Editar Questão' : 'Nova Questão'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Primeiro: Disciplina, Ano Escolar e Bloco */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Disciplina</InputLabel>
                <Select
                  value={questaoForm.disciplina}
                  label="Disciplina"
                  onChange={(e) =>
                    setQuestaoForm({ ...questaoForm, disciplina: e.target.value as DisciplinaSAEB, descritor_id: 0 })
                  }
                >
                  <MenuItem value={DisciplinaSAEB.PORTUGUES}>Português</MenuItem>
                  <MenuItem value={DisciplinaSAEB.MATEMATICA}>Matemática</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Ano Escolar</InputLabel>
                <Select
                  value={questaoForm.ano_escolar}
                  label="Ano Escolar"
                  onChange={(e) =>
                    setQuestaoForm({ ...questaoForm, ano_escolar: Number(e.target.value), descritor_id: 0 })
                  }
                >
                  <MenuItem value={5}>5º Ano</MenuItem>
                  <MenuItem value={9}>9º Ano</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Bloco</InputLabel>
                <Select
                  value={questaoForm.bloco}
                  label="Bloco"
                  onChange={(e) =>
                    setQuestaoForm({ ...questaoForm, bloco: Number(e.target.value) as BlocoSAEB })
                  }
                >
                  <MenuItem value={BlocoSAEB.BLOCO_1}>Bloco 1</MenuItem>
                  <MenuItem value={BlocoSAEB.BLOCO_2}>Bloco 2</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Depois: Descritor filtrado por Disciplina e Ano */}
            <Autocomplete
              fullWidth
              options={descritores
                .filter(
                  (d) => d.disciplina === questaoForm.disciplina && d.ano_escolar === questaoForm.ano_escolar
                )
                .sort((a, b) => {
                  // Extrair número do código (ex: D1 -> 1, D10 -> 10)
                  const numA = parseInt(a.codigo.replace(/\D/g, '')) || 0;
                  const numB = parseInt(b.codigo.replace(/\D/g, '')) || 0;
                  return numA - numB;
                })
              }
              getOptionLabel={(option) => `${option.codigo} - ${option.descricao}`}
              value={descritores.find((d) => d.id === questaoForm.descritor_id) || null}
              onChange={(_, newValue) =>
                setQuestaoForm({ ...questaoForm, descritor_id: newValue?.id || 0 })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Descritor"
                  placeholder="Digite para pesquisar..."
                  helperText={
                    descritores.filter(
                      (d) => d.disciplina === questaoForm.disciplina && d.ano_escolar === questaoForm.ano_escolar
                    ).length === 0
                      ? 'Nenhum descritor encontrado para esta disciplina e ano escolar'
                      : `${descritores.filter((d) => d.disciplina === questaoForm.disciplina && d.ano_escolar === questaoForm.ano_escolar).length} descritores disponíveis`
                  }
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Typography variant="body2">
                    <strong>{option.codigo}</strong> - {option.descricao}
                  </Typography>
                </li>
              )}
              noOptionsText="Nenhum descritor encontrado"
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />

            <TextField
              label="Enunciado"
              value={questaoForm.enunciado}
              onChange={(e) => setQuestaoForm({ ...questaoForm, enunciado: e.target.value })}
              multiline
              rows={4}
              fullWidth
            />
            <TextField
              label="Alternativa A"
              value={questaoForm.alternativa_a}
              onChange={(e) => setQuestaoForm({ ...questaoForm, alternativa_a: e.target.value })}
              fullWidth
            />
            <TextField
              label="Alternativa B"
              value={questaoForm.alternativa_b}
              onChange={(e) => setQuestaoForm({ ...questaoForm, alternativa_b: e.target.value })}
              fullWidth
            />
            <TextField
              label="Alternativa C"
              value={questaoForm.alternativa_c}
              onChange={(e) => setQuestaoForm({ ...questaoForm, alternativa_c: e.target.value })}
              fullWidth
            />
            <TextField
              label="Alternativa D"
              value={questaoForm.alternativa_d}
              onChange={(e) => setQuestaoForm({ ...questaoForm, alternativa_d: e.target.value })}
              fullWidth
            />
            <TextField
              label="Alternativa E"
              value={questaoForm.alternativa_e}
              onChange={(e) => setQuestaoForm({ ...questaoForm, alternativa_e: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Gabarito</InputLabel>
              <Select
                value={questaoForm.gabarito}
                label="Gabarito"
                onChange={(e) => setQuestaoForm({ ...questaoForm, gabarito: e.target.value })}
              >
                <MenuItem value="A">A</MenuItem>
                <MenuItem value="B">B</MenuItem>
                <MenuItem value="C">C</MenuItem>
                <MenuItem value="D">D</MenuItem>
                <MenuItem value="E">E</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestaoDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveQuestao} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default SAEBV2DescritoresPage;
