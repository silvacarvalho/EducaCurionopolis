import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  SwapHoriz as TransferIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { alunosAPI, turmasAPI, escolasAPI } from '../../services/api';
import { Aluno, Turma, Escola } from '../../types';

interface AlunoComDetalhes extends Aluno {
  turma?: {
    id: number;
    nome: string;
    ano_escolar: string;
    turno: string;
    escola_id: number;
    escola?: {
      nome: string;
    };
  };
}

const AlunosTab: React.FC = () => {
  const [alunos, setAlunos] = useState<AlunoComDetalhes[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [editingAluno, setEditingAluno] = useState<AlunoComDetalhes | null>(null);
  const [transferingAluno, setTransferingAluno] = useState<AlunoComDetalhes | null>(null);
  const [filterEscola, setFilterEscola] = useState<string>('');
  const [filterTurma, setFilterTurma] = useState<string>('');
  const [newTurmaId, setNewTurmaId] = useState<string>('');
  const [searchNome, setSearchNome] = useState<string>('');
  const [orderBy, setOrderBy] = useState<'nome' | 'matricula' | 'turma' | 'escola'>('nome');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // Form state
  const [formData, setFormData] = useState({
    nome_completo: '',
    data_nascimento: '',
    cpf: '',
    matricula: '',
    turma_id: '',
    responsavel_nome: '',
    responsavel_telefone: '',
  });

  useEffect(() => {
    loadAlunos();
    loadEscolas();
  }, []);

  const loadAlunos = async () => {
    setLoading(true);
    try {
      const response = await alunosAPI.list();
      setAlunos(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const loadEscolas = async () => {
    try {
      const response = await escolasAPI.list();
      setEscolas(response.data.filter((e: Escola) => e.ativo));
    } catch (err) {
      console.error('Erro ao carregar escolas:', err);
    }
  };

  const loadTurmasByEscola = async (escolaId: number) => {
    try {
      const response = await turmasAPI.list({ escola_id: escolaId });
      setTurmas(response.data.filter((t: Turma) => t.ativo));
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
      setTurmas([]);
    }
  };

  const handleOpenDialog = (aluno?: AlunoComDetalhes) => {
    if (aluno) {
      setEditingAluno(aluno);
      setFormData({
        nome_completo: aluno.nome_completo,
        data_nascimento: aluno.data_nascimento || '',
        cpf: aluno.cpf || '',
        matricula: aluno.matricula,
        turma_id: aluno.turma_id.toString(),
        responsavel_nome: aluno.nome_responsavel || '',
        responsavel_telefone: aluno.telefone_responsavel || '',
      });
      if (aluno.turma?.escola_id) {
        loadTurmasByEscola(aluno.turma.escola_id);
      }
    } else {
      setEditingAluno(null);
      setFormData({
        nome_completo: '',
        data_nascimento: '',
        cpf: '',
        matricula: '',
        turma_id: '',
        responsavel_nome: '',
        responsavel_telefone: '',
      });
      setTurmas([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAluno(null);
    setFormData({
      nome_completo: '',
      data_nascimento: '',
      cpf: '',
      matricula: '',
      turma_id: '',
      responsavel_nome: '',
      responsavel_telefone: '',
    });
    setTurmas([]);
  };

  const handleOpenTransferDialog = (aluno: AlunoComDetalhes) => {
    setTransferingAluno(aluno);
    setNewTurmaId('');
    if (aluno.turma?.escola_id) {
      loadTurmasByEscola(aluno.turma.escola_id);
    }
    setOpenTransferDialog(true);
  };

  const handleCloseTransferDialog = () => {
    setOpenTransferDialog(false);
    setTransferingAluno(null);
    setNewTurmaId('');
    setTurmas([]);
  };

  const handleTurmaChange = async (escolaId: string) => {
    if (escolaId) {
      await loadTurmasByEscola(parseInt(escolaId));
    } else {
      setTurmas([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const dataToSend = {
        nome_completo: formData.nome_completo,
        data_nascimento: formData.data_nascimento || undefined,
        cpf: formData.cpf || undefined,
        matricula: formData.matricula,
        turma_id: parseInt(formData.turma_id),
        nome_responsavel: formData.responsavel_nome || undefined,
        telefone_responsavel: formData.responsavel_telefone || undefined,
      };

      if (editingAluno) {
        await alunosAPI.update(editingAluno.id, dataToSend);
        setSuccess('Aluno atualizado com sucesso!');
      } else {
        await alunosAPI.create(dataToSend);
        setSuccess('Aluno criado com sucesso!');
      }

      handleCloseDialog();
      loadAlunos();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar aluno');
    }
  };

  const handleTransfer = async () => {
    if (!transferingAluno || !newTurmaId) return;

    try {
      await alunosAPI.update(transferingAluno.id, {
        turma_id: parseInt(newTurmaId),
      });
      setSuccess('Aluno transferido com sucesso!');
      handleCloseTransferDialog();
      loadAlunos();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao transferir aluno');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar este aluno?')) {
      return;
    }

    try {
      await alunosAPI.delete(id);
      setSuccess('Aluno desativado com sucesso!');
      loadAlunos();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao desativar aluno');
    }
  };

  const isFormValid = () => {
    return formData.nome_completo && formData.matricula && formData.turma_id;
  };

  const handleSort = (column: 'nome' | 'matricula' | 'turma' | 'escola') => {
    if (orderBy === column) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrderDirection('asc');
    }
  };

  const getSortIcon = (column: 'nome' | 'matricula' | 'turma' | 'escola') => {
    if (orderBy !== column) return null;
    return orderDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  const filteredAlunos = alunos
    .filter((aluno) => {
      const escolaMatch =
        !filterEscola || aluno.turma?.escola_id?.toString() === filterEscola;
      const turmaMatch = !filterTurma || aluno.turma_id.toString() === filterTurma;
      const nomeMatch = !searchNome ||
        aluno.nome_completo.toLowerCase().includes(searchNome.toLowerCase());
      return escolaMatch && turmaMatch && nomeMatch;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (orderBy) {
        case 'nome':
          comparison = a.nome_completo.localeCompare(b.nome_completo);
          break;
        case 'matricula':
          comparison = a.matricula.localeCompare(b.matricula);
          break;
        case 'turma':
          comparison = (a.turma?.nome || '').localeCompare(b.turma?.nome || '');
          break;
        case 'escola':
          comparison = (a.turma?.escola?.nome || '').localeCompare(b.turma?.escola?.nome || '');
          break;
      }

      return orderDirection === 'asc' ? comparison : -comparison;
    });

  const getTurmasForFilter = () => {
    if (filterEscola) {
      return turmas.filter((t) => t.escola_id.toString() === filterEscola);
    }
    return [];
  };

  useEffect(() => {
    if (filterEscola) {
      loadTurmasByEscola(parseInt(filterEscola));
      setFilterTurma('');
    } else {
      setTurmas([]);
      setFilterTurma('');
    }
  }, [filterEscola]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">Gerenciar Alunos</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button startIcon={<RefreshIcon />} onClick={loadAlunos}>
              Atualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Novo Aluno
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Buscar por nome..."
            value={searchNome}
            onChange={(e) => setSearchNome(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filtrar por Escola</InputLabel>
            <Select
              value={filterEscola}
              label="Filtrar por Escola"
              onChange={(e) => setFilterEscola(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {escolas.map((escola) => (
                <MenuItem key={escola.id} value={escola.id.toString()}>
                  {escola.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filtrar por Turma</InputLabel>
            <Select
              value={filterTurma}
              label="Filtrar por Turma"
              onChange={(e) => setFilterTurma(e.target.value)}
              disabled={!filterEscola}
            >
              <MenuItem value="">Todas</MenuItem>
              {getTurmasForFilter().map((turma) => (
                <MenuItem key={turma.id} value={turma.id.toString()}>
                  {turma.nome} - {turma.ano_escolar}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  onClick={() => handleSort('nome')}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Nome
                    {getSortIcon('nome')}
                  </Box>
                </TableCell>
                <TableCell
                  onClick={() => handleSort('matricula')}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Matrícula
                    {getSortIcon('matricula')}
                  </Box>
                </TableCell>
                <TableCell>Data Nasc.</TableCell>
                <TableCell
                  onClick={() => handleSort('turma')}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Turma
                    {getSortIcon('turma')}
                  </Box>
                </TableCell>
                <TableCell
                  onClick={() => handleSort('escola')}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Escola
                    {getSortIcon('escola')}
                  </Box>
                </TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlunos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      Nenhum aluno cadastrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlunos.map((aluno) => (
                  <TableRow key={aluno.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {aluno.nome_completo}
                      </Typography>
                    </TableCell>
                    <TableCell>{aluno.matricula}</TableCell>
                    <TableCell>
                      {aluno.data_nascimento
                        ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ClassIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {aluno.turma?.nome || '-'} - {aluno.turma?.ano_escolar || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SchoolIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {aluno.turma?.escola?.nome || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{aluno.nome_responsavel || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={aluno.ativo ? 'Ativo' : 'Inativo'}
                        color={aluno.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenTransferDialog(aluno)}
                        color="info"
                        title="Transferir de turma"
                      >
                        <TransferIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(aluno)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(aluno.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingAluno ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nome Completo"
              fullWidth
              required
              value={formData.nome_completo}
              onChange={(e) =>
                setFormData({ ...formData, nome_completo: e.target.value })
              }
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Matrícula"
                fullWidth
                required
                value={formData.matricula}
                onChange={(e) =>
                  setFormData({ ...formData, matricula: e.target.value })
                }
              />
              <TextField
                label="CPF"
                fullWidth
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
              <TextField
                label="Data de Nascimento"
                type="date"
                fullWidth
                value={formData.data_nascimento}
                onChange={(e) =>
                  setFormData({ ...formData, data_nascimento: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              select
              label="Escola"
              fullWidth
              required
              value={
                editingAluno
                  ? editingAluno.turma?.escola_id?.toString() || ''
                  : formData.turma_id
                  ? turmas.find((t) => t.id.toString() === formData.turma_id)?.escola_id?.toString() || ''
                  : ''
              }
              onChange={(e) => handleTurmaChange(e.target.value)}
              disabled={!!editingAluno}
              helperText={editingAluno ? 'Para mudar de escola, use a função Transferir' : ''}
            >
              {escolas.map((escola) => (
                <MenuItem key={escola.id} value={escola.id.toString()}>
                  {escola.nome}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Turma"
              fullWidth
              required
              value={formData.turma_id}
              onChange={(e) =>
                setFormData({ ...formData, turma_id: e.target.value })
              }
              disabled={turmas.length === 0}
              helperText={
                turmas.length === 0 ? 'Selecione uma escola primeiro' : ''
              }
            >
              {turmas.map((turma) => (
                <MenuItem key={turma.id} value={turma.id.toString()}>
                  {turma.nome} - {turma.ano_escolar} ({turma.turno})
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Dados do Responsável
            </Typography>
            <TextField
              label="Nome do Responsável"
              fullWidth
              value={formData.responsavel_nome}
              onChange={(e) =>
                setFormData({ ...formData, responsavel_nome: e.target.value })
              }
            />
            <TextField
              label="Telefone do Responsável"
              fullWidth
              value={formData.responsavel_telefone}
              onChange={(e) =>
                setFormData({ ...formData, responsavel_telefone: e.target.value })
              }
              placeholder="(94) 99999-9999"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isFormValid()}
          >
            {editingAluno ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog
        open={openTransferDialog}
        onClose={handleCloseTransferDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transferir Aluno de Turma</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info">
              Aluno: <strong>{transferingAluno?.nome_completo}</strong>
              <br />
              Turma atual: <strong>{transferingAluno?.turma?.nome}</strong> -{' '}
              {transferingAluno?.turma?.ano_escolar}
            </Alert>
            <TextField
              select
              label="Nova Turma"
              fullWidth
              required
              value={newTurmaId}
              onChange={(e) => setNewTurmaId(e.target.value)}
            >
              {turmas
                .filter((t) => t.id !== transferingAluno?.turma_id)
                .map((turma) => (
                  <MenuItem key={turma.id} value={turma.id.toString()}>
                    {turma.nome} - {turma.ano_escolar} ({turma.turno})
                  </MenuItem>
                ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransferDialog}>Cancelar</Button>
          <Button
            onClick={handleTransfer}
            variant="contained"
            disabled={!newTurmaId}
          >
            Transferir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlunosTab;
