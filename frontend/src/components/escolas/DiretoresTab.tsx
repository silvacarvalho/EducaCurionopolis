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
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { diretoresAPI, escolasAPI } from '../../services/api';
import { Usuario, Escola } from '../../types';

const DiretoresTab: React.FC = () => {
  const [diretores, setDiretores] = useState<Usuario[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDiretor, setEditingDiretor] = useState<Usuario | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    cpf: '',
    nome_completo: '',
    email: '',
    telefone: '',
    senha: '',
  });

  useEffect(() => {
    loadDiretores();
    loadEscolas();
  }, []);

  const loadDiretores = async () => {
    setLoading(true);
    try {
      const response = await diretoresAPI.list();
      setDiretores(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar diretores');
    } finally {
      setLoading(false);
    }
  };

  const loadEscolas = async () => {
    try {
      const response = await escolasAPI.list();
      setEscolas(response.data);
    } catch (err) {
      console.error('Erro ao carregar escolas:', err);
    }
  };

  const handleOpenDialog = (diretor?: Usuario) => {
    if (diretor) {
      setEditingDiretor(diretor);
      setFormData({
        cpf: diretor.cpf,
        nome_completo: diretor.nome_completo,
        email: diretor.email,
        telefone: diretor.telefone || '',
        senha: '',
      });
    } else {
      setEditingDiretor(null);
      setFormData({
        cpf: '',
        nome_completo: '',
        email: '',
        telefone: '',
        senha: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDiretor(null);
    setFormData({
      cpf: '',
      nome_completo: '',
      email: '',
      telefone: '',
      senha: '',
    });
  };

  const handleSubmit = async () => {
    try {
      const dataToSend: any = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        telefone: formData.telefone || undefined,
      };

      if (editingDiretor) {
        // Editing - don't send CPF or senha unless senha is filled
        if (formData.senha) {
          dataToSend.senha = formData.senha;
        }
        await diretoresAPI.update(editingDiretor.id, dataToSend);
        setSuccess('Diretor atualizado com sucesso!');
      } else {
        // Creating - send all fields including CPF and senha
        dataToSend.cpf = formData.cpf;
        dataToSend.senha = formData.senha;
        dataToSend.perfil = 'diretor_coordenador';
        await diretoresAPI.create(dataToSend);
        setSuccess('Diretor criado com sucesso!');
      }

      handleCloseDialog();
      loadDiretores();
      loadEscolas(); // Reload to update school info
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar diretor');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar este diretor?')) {
      return;
    }

    try {
      await diretoresAPI.delete(id);
      setSuccess('Diretor desativado com sucesso!');
      loadDiretores();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao desativar diretor');
    }
  };

  const getEscolaDoDiretor = (diretorId: number): string => {
    const escola = escolas.find((e) => e.diretor_id === diretorId && e.ativo);
    return escola ? escola.nome : 'Sem escola atribuída';
  };

  const isFormValid = () => {
    if (editingDiretor) {
      // When editing, only require nome, email
      return formData.nome_completo && formData.email;
    } else {
      // When creating, require all fields including cpf and senha
      return (
        formData.cpf &&
        formData.nome_completo &&
        formData.email &&
        formData.senha &&
        formData.senha.length >= 6
      );
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Gerenciar Diretores</Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadDiretores}
            sx={{ mr: 1 }}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Novo Diretor
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
                <TableCell>Nome</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Escola</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diretores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      Nenhum diretor cadastrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                diretores.map((diretor) => (
                  <TableRow key={diretor.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {diretor.nome_completo}
                      </Typography>
                    </TableCell>
                    <TableCell>{diretor.cpf}</TableCell>
                    <TableCell>{diretor.email}</TableCell>
                    <TableCell>{diretor.telefone || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SchoolIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {getEscolaDoDiretor(diretor.id)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={diretor.ativo ? 'Ativo' : 'Inativo'}
                        color={diretor.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(diretor)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(diretor.id)}
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
          {editingDiretor ? 'Editar Diretor' : 'Novo Diretor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="CPF"
              fullWidth
              required={!editingDiretor}
              disabled={!!editingDiretor}
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="000.000.000-00"
              helperText={
                editingDiretor ? 'CPF não pode ser alterado' : 'Digite o CPF do diretor'
              }
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
              required={!editingDiretor}
              type="password"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              helperText={
                editingDiretor
                  ? 'Deixe em branco para manter a senha atual'
                  : 'Mínimo 6 caracteres, máximo 72'
              }
              inputProps={{ minLength: 6, maxLength: 72 }}
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
            {editingDiretor ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiretoresTab;
