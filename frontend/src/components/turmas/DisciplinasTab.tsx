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
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Chip,
  Typography,
  MenuItem,
  Autocomplete,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  LinkOff as LinkOffIcon,
} from '@mui/icons-material';
import { disciplinasAPI, professoresAPI, turmasAPI } from '../../services/api';
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
  // Disciplinas vinculadas à turma
  const [disciplinasVinculadas, setDisciplinasVinculadas] = useState<Disciplina[]>([]);
  // Todas as disciplinas globais disponíveis
  const [disciplinasGlobais, setDisciplinasGlobais] = useState<Disciplina[]>([]);
  // Disciplinas selecionadas para vincular
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<Disciplina[]>([]);
  
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Dialogs
  const [openNovaDialog, setOpenNovaDialog] = useState(false);
  const [openVincularProfessorDialog, setOpenVincularProfessorDialog] = useState(false);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  
  // Messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form data para criar nova disciplina global
  const [formData, setFormData] = useState({
    nome: '',
    carga_horaria: '',
  });

  const [selectedProfessor, setSelectedProfessor] = useState('');

  useEffect(() => {
    if (turmaId) {
      loadDisciplinasVinculadas();
      loadDisciplinasGlobais();
      loadProfessores();
    }
  }, [turmaId]);

  const loadDisciplinasVinculadas = async () => {
    try {
      setLoading(true);
      const response = await disciplinasAPI.listByTurma(turmaId);
      setDisciplinasVinculadas(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar disciplinas da turma');
    } finally {
      setLoading(false);
    }
  };

  const loadDisciplinasGlobais = async () => {
    try {
      const response = await disciplinasAPI.list();
      setDisciplinasGlobais(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar disciplinas globais:', err);
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

  // Filtrar disciplinas disponíveis (não vinculadas)
  const disciplinasDisponiveis = disciplinasGlobais.filter(
    (global) => !disciplinasVinculadas.some((vinc) => vinc.id === global.id)
  );

  const handleOpenNovaDialog = () => {
    setFormData({ nome: '', carga_horaria: '' });
    setOpenNovaDialog(true);
  };

  const handleCloseNovaDialog = () => {
    setOpenNovaDialog(false);
    setFormData({ nome: '', carga_horaria: '' });
  };

  const handleCriarDisciplinaGlobal = async () => {
    try {
      setLoading(true);
      const dataToSend = {
        nome: formData.nome,
        carga_horaria: formData.carga_horaria ? parseInt(formData.carga_horaria) : undefined,
      };

      await disciplinasAPI.create(dataToSend);
      setSuccess('Disciplina criada com sucesso! Agora você pode vinculá-la à turma.');
      handleCloseNovaDialog();
      loadDisciplinasGlobais();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar disciplina');
    } finally {
      setLoading(false);
    }
  };

  const handleVincularDisciplinas = async () => {
    if (disciplinasSelecionadas.length === 0) {
      setError('Selecione ao menos uma disciplina para vincular');
      return;
    }

    try {
      setLoading(true);
      
      // Criar array com IDs das disciplinas já vinculadas + novas selecionadas
      const todasDisciplinasIds = [
        ...disciplinasVinculadas.map(d => d.id),
        ...disciplinasSelecionadas.map(d => d.id)
      ];

      await turmasAPI.vincularDisciplinas(turmaId, todasDisciplinasIds);
      
      setSuccess(`${disciplinasSelecionadas.length} disciplina(s) vinculada(s) com sucesso!`);
      setDisciplinasSelecionadas([]);
      loadDisciplinasVinculadas();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao vincular disciplinas');
    } finally {
      setLoading(false);
    }
  };

  const handleDesvincular = async (disciplinaId: number) => {
    if (window.confirm('Tem certeza que deseja desvincular esta disciplina da turma?')) {
      try {
        await turmasAPI.desvincularDisciplina(turmaId, disciplinaId);
        setSuccess('Disciplina desvinculada com sucesso!');
        loadDisciplinasVinculadas();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Erro ao desvincular disciplina');
      }
    }
  };

  const handleOpenVincularProfessorDialog = (disciplina: Disciplina) => {
    setSelectedDisciplina(disciplina);
    setSelectedProfessor('');
    setOpenVincularProfessorDialog(true);
  };

  const handleCloseVincularProfessorDialog = () => {
    setOpenVincularProfessorDialog(false);
    setSelectedDisciplina(null);
    setSelectedProfessor('');
  };

  const handleVincularProfessor = async () => {
    if (!selectedDisciplina || !selectedProfessor) return;

    try {
      setLoading(true);
      await disciplinasAPI.vincularProfessor(
        parseInt(selectedProfessor),
        selectedDisciplina.id
      );
      setSuccess('Professor vinculado à disciplina com sucesso!');
      handleCloseVincularProfessorDialog();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao vincular professor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* SEÇÃO 1: Disciplinas Vinculadas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="primary">
              Disciplinas Vinculadas à Turma
            </Typography>
            <Chip
              label={`${disciplinasVinculadas.length} disciplina(s)`}
              color="primary"
              size="small"
            />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Carga Horária</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : disciplinasVinculadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Alert severity="info">
                        Nenhuma disciplina vinculada. Adicione disciplinas abaixo.
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  disciplinasVinculadas.map((disciplina) => (
                    <TableRow key={disciplina.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {disciplina.nome}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {disciplina.carga_horaria ? `${disciplina.carga_horaria}h` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Vincular Professor">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenVincularProfessorDialog(disciplina)}
                          >
                            <PersonAddIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desvincular da Turma">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDesvincular(disciplina.id)}
                          >
                            <LinkOffIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* SEÇÃO 2: Adicionar Disciplinas */}
      <Card>
        <CardContent>
          <Typography variant="h6" color="secondary" sx={{ mb: 2 }}>
            Adicionar Disciplinas à Turma
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Autocomplete
              multiple
              options={disciplinasDisponiveis}
              getOptionLabel={(option) => option.nome}
              value={disciplinasSelecionadas}
              onChange={(event, newValue) => {
                setDisciplinasSelecionadas(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selecionar Disciplinas"
                  placeholder="Buscar disciplinas..."
                  helperText="Selecione uma ou mais disciplinas para vincular"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2">{option.nome}</Typography>
                    {option.carga_horaria && (
                      <Typography variant="caption" color="text.secondary">
                        {option.carga_horaria}h semanais
                      </Typography>
                    )}
                  </Box>
                </li>
              )}
              noOptionsText="Nenhuma disciplina disponível"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenNovaDialog}
            >
              Criar Nova Disciplina Global
            </Button>
            
            <Button
              variant="contained"
              onClick={handleVincularDisciplinas}
              disabled={disciplinasSelecionadas.length === 0 || loading}
            >
              Vincular Selecionadas ({disciplinasSelecionadas.length})
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Dialog: Criar Nova Disciplina Global */}
      <Dialog open={openNovaDialog} onClose={handleCloseNovaDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Nova Disciplina Global</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            Disciplinas globais podem ser reutilizadas em múltiplas turmas.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome da Disciplina"
              fullWidth
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Matemática, Português, etc."
            />
            <TextField
              label="Carga Horária Semanal (horas)"
              type="number"
              fullWidth
              value={formData.carga_horaria}
              onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
              placeholder="Ex: 4"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNovaDialog}>Cancelar</Button>
          <Button
            onClick={handleCriarDisciplinaGlobal}
            variant="contained"
            disabled={loading || !formData.nome}
          >
            Criar Disciplina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Vincular Professor */}
      <Dialog
        open={openVincularProfessorDialog}
        onClose={handleCloseVincularProfessorDialog}
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
                  {professor.usuario?.nome_completo}{' '}
                  {professor.matricula ? `- ${professor.matricula}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVincularProfessorDialog}>Cancelar</Button>
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
