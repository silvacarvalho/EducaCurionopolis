import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Chip,
  Typography,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
} from '@mui/icons-material';
import { disciplinasAPI, professoresAPI } from '../../services/api';
import { Disciplina } from '../../types';

interface Professor {
  id: number;
  usuario_id: number;
  escola_id: number;
  matricula?: string;
  formacao?: string;
  ativo: boolean;
  created_at: string;
  usuario?: {
    id: number;
    nome_completo: string;
    email: string;
  };
}

interface DisciplinasTabProps {
  turmaId: number;
  escolaId: number;
}

const DisciplinasTab: React.FC<DisciplinasTabProps> = ({ turmaId, escolaId }) => {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openVincularDialog, setOpenVincularDialog] = useState(false);
  const [editingDisciplina, setEditingDisciplina] = useState<Disciplina | null>(null);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    carga_horaria: '',
  });

  const [selectedProfessor, setSelectedProfessor] = useState('');

  useEffect(() => {
    if (turmaId) {
      loadDisciplinas();
      loadProfessores();
    }
  }, [turmaId]);

  const loadDisciplinas = async () => {
    try {
      setLoading(true);
      const response = await disciplinasAPI.list({ turma_id: turmaId });
      setDisciplinas(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar disciplinas');
    } finally {
      setLoading(false);
    }
  };

  const loadProfessores = async () => {
    try {
      const response = await professoresAPI.list({ escola_id: escolaId });
      setProfessores(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar professores:', err);
    }
  };

  const handleOpenDialog = (disciplina?: Disciplina) => {
    if (disciplina) {
      setEditingDisciplina(disciplina);
      setFormData({
        nome: disciplina.nome,
        carga_horaria: disciplina.carga_horaria?.toString() || '',
      });
    } else {
      setEditingDisciplina(null);
      setFormData({
        nome: '',
        carga_horaria: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDisciplina(null);
    setFormData({
      nome: '',
      carga_horaria: '',
    });
  };

  const handleOpenVincularDialog = (disciplina: Disciplina) => {
    setSelectedDisciplina(disciplina);
    setSelectedProfessor('');
    setOpenVincularDialog(true);
  };

  const handleCloseVincularDialog = () => {
    setOpenVincularDialog(false);
    setSelectedDisciplina(null);
    setSelectedProfessor('');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const dataToSend = {
        nome: formData.nome,
        carga_horaria: formData.carga_horaria ? parseInt(formData.carga_horaria) : undefined,
        turma_id: turmaId,
      };

      if (editingDisciplina) {
        await disciplinasAPI.update(editingDisciplina.id, {
          nome: formData.nome,
          carga_horaria: formData.carga_horaria ? parseInt(formData.carga_horaria) : undefined,
        });
        setSuccess('Disciplina atualizada com sucesso!');
      } else {
        await disciplinasAPI.create(dataToSend);
        setSuccess('Disciplina criada com sucesso!');
      }

      handleCloseDialog();
      loadDisciplinas();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar disciplina');
    } finally {
      setLoading(false);
    }
  };

  const handleVincularProfessor = async () => {
    if (!selectedDisciplina || !selectedProfessor) return;

    try {
      setLoading(true);
      await disciplinasAPI.vincularProfessor(
        parseInt(selectedProfessor),
        selectedDisciplina.id
      );
      setSuccess('Professor vinculado com sucesso!');
      handleCloseVincularDialog();
      loadDisciplinas();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao vincular professor');
    } finally {
      setLoading(false);
    }
  };

  const handleDesvincularProfessor = async (
    professorId: number,
    disciplinaId: number
  ) => {
    if (window.confirm('Tem certeza que deseja desvincular este professor?')) {
      try {
        await disciplinasAPI.desvincularProfessor(professorId, disciplinaId);
        setSuccess('Professor desvinculado com sucesso!');
        loadDisciplinas();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Erro ao desvincular professor');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      try {
        await disciplinasAPI.delete(id);
        setSuccess('Disciplina excluída com sucesso!');
        loadDisciplinas();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Erro ao excluir disciplina');
      }
    }
  };

  const getProfessorNome = (professorId: number) => {
    const professor = professores.find((p) => p.id === professorId);
    return professor?.usuario?.nome_completo || '-';
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Disciplinas da Turma</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nova Disciplina
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Carga Horária</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : disciplinas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Nenhuma disciplina cadastrada
                </TableCell>
              </TableRow>
            ) : (
              disciplinas.map((disciplina) => (
                <TableRow key={disciplina.id}>
                  <TableCell>{disciplina.nome}</TableCell>
                  <TableCell>
                    {disciplina.carga_horaria ? `${disciplina.carga_horaria}h` : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={disciplina.ativo ? 'Ativa' : 'Inativa'}
                      color={disciplina.ativo ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Vincular Professor">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleOpenVincularDialog(disciplina)}
                      >
                        <PersonAddIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(disciplina)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(disciplina.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDisciplina ? 'Editar Disciplina' : 'Nova Disciplina'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nome da Disciplina"
              fullWidth
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Matemática, Português, etc."
            />
            <TextField
              label="Carga Horária (horas)"
              type="number"
              fullWidth
              value={formData.carga_horaria}
              onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
              placeholder="Ex: 40"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.nome}
          >
            {editingDisciplina ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vincular Professor Dialog */}
      <Dialog
        open={openVincularDialog}
        onClose={handleCloseVincularDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Vincular Professor</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Selecione um professor para lecionar a disciplina{' '}
              <strong>{selectedDisciplina?.nome}</strong>
            </Alert>
            <TextField
              select
              label="Professor"
              fullWidth
              required
              value={selectedProfessor}
              onChange={(e) => setSelectedProfessor(e.target.value)}
            >
              {professores.map((professor) => (
                <MenuItem key={professor.id} value={professor.id.toString()}>
                  {professor.usuario?.nome_completo} {professor.matricula ? `- ${professor.matricula}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVincularDialog}>Cancelar</Button>
          <Button
            onClick={handleVincularProfessor}
            variant="contained"
            disabled={loading || !selectedProfessor}
          >
            Vincular
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DisciplinasTab;
