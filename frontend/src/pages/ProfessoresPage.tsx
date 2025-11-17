import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { professoresAPI, escolasAPI } from '../services/api';
import { Professor, Escola } from '../types';

interface ProfessorComUsuario extends Professor {
  usuario?: {
    id: number;
    cpf: string;
    nome_completo: string;
    email: string;
    telefone?: string;
    ativo: boolean;
  };
  escola?: {
    id: number;
    nome: string;
  };
}

const ProfessoresPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [professores, setProfessores] = useState<ProfessorComUsuario[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<ProfessorComUsuario | null>(null);
  const [filterEscola, setFilterEscola] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    cpf: '',
    nome_completo: '',
    email: '',
    telefone: '',
    senha: '',
    escola_id: '',
    matricula: '',
    formacao: '',
  });

  useEffect(() => {
    loadProfessores();
    loadEscolas();
  }, []);

  const loadProfessores = async () => {
    setLoading(true);
    try {
      const response = await professoresAPI.list();
      setProfessores(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar professores');
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

  const handleOpenDialog = (professor?: ProfessorComUsuario) => {
    if (professor) {
      setEditingProfessor(professor);
      setFormData({
        cpf: professor.usuario?.cpf || '',
        nome_completo: professor.usuario?.nome_completo || '',
        email: professor.usuario?.email || '',
        telefone: professor.usuario?.telefone || '',
        senha: '',
        escola_id: professor.escola_id.toString(),
        matricula: professor.matricula || '',
        formacao: professor.formacao || '',
      });
    } else {
      setEditingProfessor(null);
      setFormData({
        cpf: '',
        nome_completo: '',
        email: '',
        telefone: '',
        senha: '',
        escola_id: '',
        matricula: '',
        formacao: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProfessor(null);
    setFormData({
      cpf: '',
      nome_completo: '',
      email: '',
      telefone: '',
      senha: '',
      escola_id: '',
      matricula: '',
      formacao: '',
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingProfessor) {
        // Update - can update all fields except CPF
        const updateData: any = {
          nome_completo: formData.nome_completo,
          email: formData.email,
          telefone: formData.telefone || undefined,
          formacao: formData.formacao || undefined,
        };

        // Only send senha if it was filled
        if (formData.senha) {
          updateData.senha = formData.senha;
        }

        await professoresAPI.update(editingProfessor.id, updateData);
        setSuccess('Professor atualizado com sucesso!');
      } else {
        // Create
        const createData = {
          usuario: {
            cpf: formData.cpf,
            nome_completo: formData.nome_completo,
            email: formData.email,
            telefone: formData.telefone || undefined,
            senha: formData.senha,
            perfil: 'professor',
          },
          escola_id: parseInt(formData.escola_id),
          matricula: formData.matricula || undefined,
          formacao: formData.formacao || undefined,
        };
        await professoresAPI.create(createData);
        setSuccess('Professor criado com sucesso!');
      }

      handleCloseDialog();
      loadProfessores();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar professor');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar este professor?')) {
      return;
    }

    try {
      await professoresAPI.delete(id);
      setSuccess('Professor desativado com sucesso!');
      loadProfessores();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao desativar professor');
    }
  };

  const getEscolaNome = (escolaId: number): string => {
    const escola = escolas.find((e) => e.id === escolaId);
    return escola ? escola.nome : `Escola #${escolaId}`;
  };

  const isFormValid = () => {
    if (editingProfessor) {
      // When editing, require nome_completo and email, senha is optional
      const senhaValid = !formData.senha || formData.senha.length >= 6;
      return formData.nome_completo && formData.email && senhaValid;
    } else {
      // When creating, require all fields
      return (
        formData.cpf &&
        formData.nome_completo &&
        formData.email &&
        formData.senha &&
        formData.senha.length >= 6 &&
        formData.escola_id
      );
    }
  };

  const filteredProfessores = filterEscola
    ? professores.filter((p) => p.escola_id.toString() === filterEscola)
    : professores;

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Gerenciamento de Professores
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.nome_completo}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">Professores</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filtrar por Escola</InputLabel>
                <Select
                  value={filterEscola}
                  label="Filtrar por Escola"
                  onChange={(e) => setFilterEscola(e.target.value)}
                >
                  <MenuItem value="">Todas as Escolas</MenuItem>
                  {escolas.map((escola) => (
                    <MenuItem key={escola.id} value={escola.id.toString()}>
                      {escola.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadProfessores}
              >
                Atualizar
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Novo Professor
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Escola</TableCell>
                    <TableCell>Matrícula</TableCell>
                    <TableCell>Formação</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProfessores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          Nenhum professor cadastrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfessores.map((professor) => (
                      <TableRow key={professor.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {professor.usuario?.nome_completo || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{professor.usuario?.cpf || '-'}</TableCell>
                        <TableCell>{professor.usuario?.email || '-'}</TableCell>
                        <TableCell>{professor.usuario?.telefone || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SchoolIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {professor.escola?.nome || getEscolaNome(professor.escola_id)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{professor.matricula || '-'}</TableCell>
                        <TableCell>{professor.formacao || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={professor.ativo ? 'Ativo' : 'Inativo'}
                            color={professor.ativo ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(professor)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(professor.id)}
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
              {editingProfessor ? 'Editar Professor' : 'Novo Professor'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <TextField
                  label="CPF"
                  fullWidth
                  required={!editingProfessor}
                  disabled={!!editingProfessor}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  helperText={editingProfessor ? 'CPF não pode ser alterado' : ''}
                />
                <TextField
                  label="Nome Completo"
                  fullWidth
                  required
                  value={formData.nome_completo}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_completo: e.target.value })
                  }
                />
                <TextField
                  label="Email"
                  fullWidth
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <TextField
                  label="Telefone"
                  fullWidth
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                  placeholder="(94) 99999-9999"
                />
                <TextField
                  label="Senha"
                  fullWidth
                  required={!editingProfessor}
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  helperText={
                    editingProfessor
                      ? 'Deixe em branco para manter a senha atual'
                      : 'Mínimo 6 caracteres, máximo 72'
                  }
                  inputProps={{ minLength: 6, maxLength: 72 }}
                />
                {!editingProfessor && (
                  <>
                    <TextField
                      select
                      label="Escola"
                      fullWidth
                      required
                      value={formData.escola_id}
                      onChange={(e) =>
                        setFormData({ ...formData, escola_id: e.target.value })
                      }
                    >
                      {escolas.map((escola) => (
                        <MenuItem key={escola.id} value={escola.id.toString()}>
                          {escola.nome}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Matrícula"
                      fullWidth
                      value={formData.matricula}
                      onChange={(e) =>
                        setFormData({ ...formData, matricula: e.target.value })
                      }
                    />
                  </>
                )}
                <TextField
                  label="Formação"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.formacao}
                  onChange={(e) =>
                    setFormData({ ...formData, formacao: e.target.value })
                  }
                  placeholder="Ex: Graduação em Pedagogia, Pós-graduação em Alfabetização"
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
                {editingProfessor ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Container>
    </Box>
  );
};

export default ProfessoresPage;
