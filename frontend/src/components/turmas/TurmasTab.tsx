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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { turmasAPI, escolasAPI, professoresAPI } from '../../services/api';
import { Turma, Escola, Professor } from '../../types';

interface TurmaComDetalhes extends Turma {
  escola?: {
    id: number;
    nome: string;
  };
  professor?: {
    id: number;
    usuario?: {
      nome_completo: string;
    };
  };
  total_alunos?: number;
}

interface TurmasTabProps {
  onTurmaSelect?: (turma: { id: number; escola_id: number }) => void;
}

const TurmasTab: React.FC<TurmasTabProps> = ({ onTurmaSelect }) => {
  const [turmas, setTurmas] = useState<TurmaComDetalhes[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTurma, setEditingTurma] = useState<TurmaComDetalhes | null>(null);
  const [filterEscola, setFilterEscola] = useState<string>('');
  const [filterAno, setFilterAno] = useState<string>('');
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [orderBy, setOrderBy] = useState<'nome' | 'ano_escolar' | 'escola' | 'alunos'>('nome');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    ano_escolar: '',
    turno: '',
    escola_id: '',
    professor_id: '',
  });

  const anosEscolares = [
    { value: 1, label: '1º Ano' },
    { value: 2, label: '2º Ano' },
    { value: 3, label: '3º Ano' },
    { value: 4, label: '4º Ano' },
    { value: 5, label: '5º Ano' },
    { value: 6, label: '6º Ano' },
    { value: 7, label: '7º Ano' },
    { value: 8, label: '8º Ano' },
    { value: 9, label: '9º Ano' },
  ];

  const turnos = ['Matutino', 'Vespertino', 'Noturno'];

  useEffect(() => {
    loadTurmas();
    loadEscolas();
  }, []);

  const loadTurmas = async () => {
    setLoading(true);
    try {
      const response = await turmasAPI.list();
      setTurmas(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar turmas');
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

  const loadProfessoresByEscola = async (escolaId: number) => {
    try {
      const response = await professoresAPI.list({ escola_id: escolaId });
      setProfessores(response.data.filter((p: Professor) => p.ativo));
    } catch (err) {
      console.error('Erro ao carregar professores:', err);
      setProfessores([]);
    }
  };

  const handleOpenDialog = (turma?: TurmaComDetalhes) => {
    if (turma) {
      setEditingTurma(turma);
      setFormData({
        nome: turma.nome,
        ano_escolar: turma.ano_escolar.toString(),
        turno: turma.turno || '',
        escola_id: turma.escola_id.toString(),
        professor_id: turma.professor_id?.toString() || '',
      });
      if (turma.escola_id) {
        loadProfessoresByEscola(turma.escola_id);
      }
    } else {
      setEditingTurma(null);
      setFormData({
        nome: '',
        ano_escolar: '',
        turno: '',
        escola_id: '',
        professor_id: '',
      });
      setProfessores([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTurma(null);
    setFormData({
      nome: '',
      ano_escolar: '',
      turno: '',
      escola_id: '',
      professor_id: '',
    });
    setProfessores([]);
  };

  const handleEscolaChange = (escolaId: string) => {
    setFormData({ ...formData, escola_id: escolaId, professor_id: '' });
    if (escolaId) {
      loadProfessoresByEscola(parseInt(escolaId));
    } else {
      setProfessores([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const dataToSend: any = {
        nome: formData.nome,
        ano_escolar: parseInt(formData.ano_escolar),
        turno: formData.turno || undefined,
        escola_id: parseInt(formData.escola_id),
        professor_id: formData.professor_id ? parseInt(formData.professor_id) : undefined,
      };

      if (editingTurma) {
        await turmasAPI.update(editingTurma.id, dataToSend);
        setSuccess('Turma atualizada com sucesso!');
      } else {
        await turmasAPI.create(dataToSend);
        setSuccess('Turma criada com sucesso!');
      }

      handleCloseDialog();
      loadTurmas();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar turma');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar esta turma?')) {
      return;
    }

    try {
      await turmasAPI.delete(id);
      setSuccess('Turma desativada com sucesso!');
      loadTurmas();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao desativar turma');
    }
  };

  const getEscolaNome = (escolaId: number): string => {
    const escola = escolas.find((e) => e.id === escolaId);
    return escola ? escola.nome : `Escola #${escolaId}`;
  };

  const getAnoEscolarLabel = (ano: number): string => {
    const anoObj = anosEscolares.find((a) => a.value === ano);
    return anoObj ? anoObj.label : `${ano}º Ano`;
  };

  const getProfessorNome = (professor?: TurmaComDetalhes['professor']): string => {
    if (!professor || !professor.usuario) return 'Sem professor';
    return professor.usuario.nome_completo;
  };

  const isFormValid = () => {
    return (
      formData.nome &&
      formData.ano_escolar &&
      formData.escola_id
    );
  };

  const handleSort = (column: 'nome' | 'ano_escolar' | 'escola' | 'alunos') => {
    if (orderBy === column) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrderDirection('asc');
    }
  };

  const getSortIcon = (column: 'nome' | 'ano_escolar' | 'escola' | 'alunos') => {
    if (orderBy !== column) return null;
    return orderDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  const filteredTurmas = turmas
    .filter((turma) => {
      const escolaMatch = !filterEscola || turma.escola_id.toString() === filterEscola;
      const anoMatch = !filterAno || turma.ano_escolar.toString() === filterAno;
      return escolaMatch && anoMatch;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (orderBy) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'ano_escolar':
          comparison = a.ano_escolar - b.ano_escolar;
          break;
        case 'escola':
          comparison = (a.escola?.nome || '').localeCompare(b.escola?.nome || '');
          break;
        case 'alunos':
          comparison = (a.total_alunos || 0) - (b.total_alunos || 0);
          break;
      }

      return orderDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Gerenciar Turmas</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filtrar por Ano</InputLabel>
            <Select
              value={filterAno}
              label="Filtrar por Ano"
              onChange={(e) => setFilterAno(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {anosEscolares.map((ano) => (
                <MenuItem key={ano.value} value={ano.value.toString()}>
                  {ano.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button startIcon={<RefreshIcon />} onClick={loadTurmas}>
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nova Turma
          </Button>
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
                  onClick={() => handleSort('ano_escolar')}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Ano Escolar
                    {getSortIcon('ano_escolar')}
                  </Box>
                </TableCell>
                <TableCell>Ano Letivo</TableCell>
                <TableCell>Turno</TableCell>
                <TableCell
                  onClick={() => handleSort('escola')}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Escola
                    {getSortIcon('escola')}
                  </Box>
                </TableCell>
                <TableCell>Professor</TableCell>
                <TableCell
                  onClick={() => handleSort('alunos')}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Alunos
                    {getSortIcon('alunos')}
                  </Box>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTurmas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      Nenhuma turma cadastrada
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTurmas.map((turma) => (
                  <TableRow
                    key={turma.id}
                    selected={selectedTurmaId === turma.id}
                    onClick={() => {
                      setSelectedTurmaId(turma.id);
                      if (onTurmaSelect) {
                        onTurmaSelect({ id: turma.id, escola_id: turma.escola_id });
                      }
                    }}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {turma.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>{getAnoEscolarLabel(turma.ano_escolar)}</TableCell>
                    <TableCell>{turma.ano_letivo}</TableCell>
                    <TableCell>{turma.turno || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SchoolIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {turma.escola?.nome || getEscolaNome(turma.escola_id)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {getProfessorNome(turma.professor)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PeopleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {turma.total_alunos || 0}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={turma.ativo ? 'Ativo' : 'Inativo'}
                        color={turma.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(turma)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(turma.id)}
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTurma ? 'Editar Turma' : 'Nova Turma'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nome da Turma"
              fullWidth
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Turma A, Turma B"
            />
            <TextField
              select
              label="Ano Escolar"
              fullWidth
              required
              value={formData.ano_escolar}
              onChange={(e) =>
                setFormData({ ...formData, ano_escolar: e.target.value })
              }
            >
              {anosEscolares.map((ano) => (
                <MenuItem key={ano.value} value={ano.value.toString()}>
                  {ano.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Turno"
              fullWidth
              value={formData.turno}
              onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
            >
              <MenuItem value="">Sem turno definido</MenuItem>
              {turnos.map((turno) => (
                <MenuItem key={turno} value={turno}>
                  {turno}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Escola"
              fullWidth
              required
              value={formData.escola_id}
              onChange={(e) => handleEscolaChange(e.target.value)}
            >
              {escolas.map((escola) => (
                <MenuItem key={escola.id} value={escola.id.toString()}>
                  {escola.nome}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Professor Responsável"
              fullWidth
              value={formData.professor_id}
              onChange={(e) =>
                setFormData({ ...formData, professor_id: e.target.value })
              }
              disabled={!formData.escola_id}
              helperText={
                !formData.escola_id
                  ? 'Selecione uma escola primeiro'
                  : 'Opcional - pode ser atribuído depois'
              }
            >
              <MenuItem value="">Sem professor</MenuItem>
              {professores.map((professor) => (
                <MenuItem key={professor.id} value={professor.id.toString()}>
                  {professor.usuario?.nome_completo || `Professor #${professor.id}`}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isFormValid()}
          >
            {editingTurma ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TurmasTab;
