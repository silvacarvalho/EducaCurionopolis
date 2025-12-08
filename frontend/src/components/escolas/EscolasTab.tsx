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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { escolasAPI, diretoresAPI } from '../../services/api';
import { Escola, Usuario } from '../../types';
import { useFilteredData } from '../../hooks/useFilteredData';

const EscolasTab: React.FC = () => {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  
  // Aplicar filtro contextual na busca do header
  const filteredEscolas = useFilteredData(escolas, ['nome', 'codigo_inep', 'endereco']);
  
  const [diretores, setDiretores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEscola, setEditingEscola] = useState<Escola | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    telefone: '',
    email: '',
    codigo_inep: '',
    diretor_id: '',
  });

  useEffect(() => {
    loadEscolas();
    loadDiretores();
  }, []);

  const loadEscolas = async () => {
    setLoading(true);
    try {
      const response = await escolasAPI.list();
      setEscolas(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar escolas');
    } finally {
      setLoading(false);
    }
  };

  const loadDiretores = async () => {
    try {
      const response = await diretoresAPI.list();
      setDiretores(response.data);
    } catch (err) {
      console.error('Erro ao carregar diretores:', err);
    }
  };

  const handleOpenDialog = (escola?: Escola) => {
    if (escola) {
      setEditingEscola(escola);
      setFormData({
        nome: escola.nome,
        endereco: escola.endereco || '',
        telefone: escola.telefone || '',
        email: escola.email || '',
        codigo_inep: escola.codigo_inep || '',
        diretor_id: escola.diretor_id?.toString() || '',
      });
    } else {
      setEditingEscola(null);
      setFormData({
        nome: '',
        endereco: '',
        telefone: '',
        email: '',
        codigo_inep: '',
        diretor_id: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEscola(null);
    setFormData({
      nome: '',
      endereco: '',
      telefone: '',
      email: '',
      codigo_inep: '',
      diretor_id: '',
    });
  };

  const handleSubmit = async () => {
    try {
      const dataToSend = {
        ...formData,
        diretor_id: formData.diretor_id ? parseInt(formData.diretor_id) : undefined,
      };

      if (editingEscola) {
        await escolasAPI.update(editingEscola.id, dataToSend);
        setSuccess('Escola atualizada com sucesso!');
      } else {
        await escolasAPI.create(dataToSend);
        setSuccess('Escola criada com sucesso!');
      }

      handleCloseDialog();
      loadEscolas();
      loadDiretores(); // Reload to update available directors
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar escola');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar esta escola?')) {
      return;
    }

    try {
      await escolasAPI.delete(id);
      setSuccess('Escola desativada com sucesso!');
      loadEscolas();
      loadDiretores(); // Reload to update available directors
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao desativar escola');
    }
  };

  const getDiretorNome = (diretorId?: number) => {
    if (!diretorId) return 'Sem diretor';
    const diretor = diretores.find((d) => d.id === diretorId);
    return diretor ? diretor.nome_completo : `Diretor #${diretorId}`;
  };

  // Get available directors (not managing another school)
  const getAvailableDiretores = () => {
    const escolasComDiretor = escolas
      .filter((e) => e.diretor_id && e.ativo)
      .map((e) => e.diretor_id);

    return diretores.filter((d) => {
      // If editing, allow current director
      if (editingEscola && editingEscola.diretor_id === d.id) {
        return true;
      }
      // Otherwise, only show directors not managing a school
      return !escolasComDiretor.includes(d.id);
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await escolasAPI.downloadTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_importacao_escolas_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('Template baixado com sucesso!');
    } catch (err: any) {
      setError('Erro ao baixar template');
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setError('');
    setSuccess('');

    try {
      const response = await escolasAPI.importar(file);
      setImportResult(response.data);
      if (response.data.sucesso > 0) {
        setSuccess(`${response.data.sucesso} escola(s) importada(s) com sucesso!`);
        loadEscolas();
        loadDiretores();
      }
      if (response.data.erros?.length > 0) {
        setError(`${response.data.erros.length} erro(s) encontrado(s). Verifique os detalhes abaixo.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao importar arquivo');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">Gerenciar Escolas</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            variant="outlined"
            color="info"
          >
            Baixar Template
          </Button>
          <Button
            component="label"
            startIcon={<UploadIcon />}
            variant="outlined"
            color="success"
            disabled={importing}
          >
            {importing ? 'Importando...' : 'Importar Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleImportFile}
            />
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadEscolas}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nova Escola
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

      {/* Resultado da importação */}
      {importResult && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Resultado da Importação
          </Typography>
          <Typography variant="body2">
            Total de registros: {importResult.total} | 
            Sucesso: <strong style={{ color: 'green' }}>{importResult.sucesso}</strong> | 
            Erros: <strong style={{ color: 'red' }}>{importResult.erros?.length || 0}</strong>
          </Typography>
          {importResult.erros?.length > 0 && (
            <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
              <Typography variant="caption" color="error">
                Erros encontrados:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {importResult.erros.map((erro: string, idx: number) => (
                  <li key={idx}>
                    <Typography variant="caption" color="error">{erro}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
          <Button size="small" onClick={() => setImportResult(null)} sx={{ mt: 1 }}>
            Fechar
          </Button>
        </Paper>
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
                <TableCell>Endereço</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Código INEP</TableCell>
                <TableCell>Diretor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEscolas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      {escolas.length === 0 ? 'Nenhuma escola cadastrada' : 'Nenhuma escola encontrada com esse termo de busca'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEscolas.map((escola) => (
                  <TableRow key={escola.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {escola.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>{escola.endereco || '-'}</TableCell>
                    <TableCell>{escola.telefone || '-'}</TableCell>
                    <TableCell>{escola.email || '-'}</TableCell>
                    <TableCell>{escola.codigo_inep || '-'}</TableCell>
                    <TableCell>{getDiretorNome(escola.diretor_id)}</TableCell>
                    <TableCell>
                      <Chip
                        label={escola.ativo ? 'Ativo' : 'Inativo'}
                        color={escola.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(escola)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(escola.id)}
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
          {editingEscola ? 'Editar Escola' : 'Nova Escola'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nome da Escola"
              fullWidth
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            <TextField
              label="Endereço"
              fullWidth
              value={formData.endereco}
              onChange={(e) =>
                setFormData({ ...formData, endereco: e.target.value })
              }
            />
            <TextField
              label="Telefone"
              fullWidth
              value={formData.telefone}
              onChange={(e) =>
                setFormData({ ...formData, telefone: e.target.value })
              }
            />
            <TextField
              label="Email"
              required
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Código INEP"
              fullWidth
              value={formData.codigo_inep}
              onChange={(e) =>
                setFormData({ ...formData, codigo_inep: e.target.value })
              }
            />
            <TextField
              select
              label="Diretor"
              required
              fullWidth
              value={formData.diretor_id}
              onChange={(e) =>
                setFormData({ ...formData, diretor_id: e.target.value })
              }
            >
              <MenuItem value="">Sem diretor</MenuItem>
              {getAvailableDiretores().map((diretor) => (
                <MenuItem key={diretor.id} value={diretor.id.toString()}>
                  {diretor.nome_completo}
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
            disabled={!formData.nome}
          >
            {editingEscola ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EscolasTab;
