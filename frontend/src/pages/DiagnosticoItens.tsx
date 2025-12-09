/**
 * Gestão de Itens de Diagnóstico (GESTÃO MUNICIPAL)
 * Permite criar, editar e gerenciar itens reutilizáveis
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Checkbox,
  FormGroup,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete, ArrowBack as ArrowBackIcon, Download as DownloadIcon, Upload as UploadIcon } from '@mui/icons-material';
import { diagnosticosAPI } from '../services/api';
import { ItemDiagnostico, ModalidadeDiagnostico } from '../types';
import MainLayout from '../components/layout/MainLayout';


const DiagnosticoItens: React.FC = () => {
  const [itens, setItens] = useState<ItemDiagnostico[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemDiagnostico | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Form state
  const [descricao, setDescricao] = useState('');
  const [modalidade, setModalidade] = useState<ModalidadeDiagnostico>(ModalidadeDiagnostico.LEITURA);
  const [anosAplicaveis, setAnosAplicaveis] = useState<number[]>([]);

  const loadItens = async () => {
    try {
      setLoading(true);
      const response = await diagnosticosAPI.listItens({ ativo: true });
      setItens(response.data);
    } catch (err: any) {
      setError('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItens();
  }, []);

  const handleOpenDialog = (item?: ItemDiagnostico) => {
    if (item) {
      setEditingItem(item);
      setDescricao(item.descricao);
      setModalidade(item.modalidade);
      setAnosAplicaveis(item.anos_aplicaveis.split(',').map(Number));
    } else {
      setEditingItem(null);
      setDescricao('');
      setModalidade(ModalidadeDiagnostico.LEITURA);
      setAnosAplicaveis([]);
    }
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setDescricao('');
    setAnosAplicaveis([]);
  };

  const handleAnoChange = (ano: number) => {
    setAnosAplicaveis(prev =>
      prev.includes(ano) ? prev.filter(a => a !== ano) : [...prev, ano].sort()
    );
  };

  const handleSave = async () => {
    if (!descricao.trim()) {
      setError('Descrição é obrigatória');
      return;
    }

    if (anosAplicaveis.length === 0) {
      setError('Selecione pelo menos um ano');
      return;
    }

    try {
      setLoading(true);
      const data = {
        descricao,
        modalidade,
        anos_aplicaveis: anosAplicaveis.join(','),
      };

      if (editingItem) {
        await diagnosticosAPI.updateItem(editingItem.id, data);
        setSuccess('Item atualizado com sucesso');
      } else {
        await diagnosticosAPI.createItem(data);
        setSuccess('Item criado com sucesso');
      }

      handleCloseDialog();
      loadItens();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este item?')) return;

    try {
      await diagnosticosAPI.deleteItem(id);
      setSuccess('Item deletado com sucesso');
      loadItens();
    } catch (err: any) {
      setError('Erro ao deletar item');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await diagnosticosAPI.downloadTemplateItens();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_itens_diagnostico.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Template baixado com sucesso');
    } catch (err: any) {
      setError('Erro ao baixar template');
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportResult(null);
      const formData = new FormData();
      formData.append('file', file);

      const response = await diagnosticosAPI.importarItens(formData);
      setImportResult(response.data);
      
      if (response.data.erros.length === 0) {
        setSuccess(`${response.data.sucesso} itens importados com sucesso!`);
      } else {
        setError(`Importados ${response.data.sucesso} de ${response.data.total_linhas} itens. Verifique os erros.`);
      }
      
      loadItens();
      event.target.value = ''; // Reset file input
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao importar itens');
    } finally {
      setImporting(false);
    }
  };

  const getModalidadeLabel = (mod: ModalidadeDiagnostico) => {
    return mod === ModalidadeDiagnostico.LEITURA ? 'Leitura' : 'Escrita';
  };

  const getModalidadeColor = (mod: ModalidadeDiagnostico) => {
    return mod === ModalidadeDiagnostico.LEITURA ? 'primary' : 'secondary';
  };

  return (
    <MainLayout title="Gestão de Itens de Diagnóstico">
      <Box sx={{ width: '100%', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Itens de Diagnóstico</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="info"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
            >
              Baixar Template
            </Button>
            <Button
              variant="outlined"
              color="success"
              component="label"
              startIcon={<UploadIcon />}
              disabled={importing}
            >
              {importing ? 'Importando...' : 'Importar Itens'}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleImportFile}
              />
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Novo Item
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {importResult && importResult.erros.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Erros na importação:</Typography>
            <ul>
              {importResult.erros.map((erro: string, idx: number) => (
                <li key={idx}>{erro}</li>
              ))}
            </ul>
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="50">#</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Modalidade</TableCell>
                <TableCell>Anos Aplicáveis</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {itens.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell>
                    <Chip
                      label={getModalidadeLabel(item.modalidade)}
                      color={getModalidadeColor(item.modalidade)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {item.anos_aplicaveis.split(',').map(ano => (
                      <Chip key={ano} label={`${ano}º ano`} size="small" sx={{ mr: 0.5 }} />
                    ))}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenDialog(item)} size="small">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item.id)} size="small" color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary">
            Total: {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          </Typography>
        </Box>
      </Box>

      {/* Dialog para criar/editar item */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Editar Item' : 'Novo Item de Diagnóstico'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Descrição do Item"
              multiline
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Reconhece letras do alfabeto"
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Modalidade</InputLabel>
              <Select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value as ModalidadeDiagnostico)}
                label="Modalidade"
              >
                <MenuItem value={ModalidadeDiagnostico.LEITURA}>Leitura</MenuItem>
                <MenuItem value={ModalidadeDiagnostico.ESCRITA}>Escrita</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Anos Aplicáveis
            </Typography>
            <FormGroup row>
              {[1, 2, 3, 4, 5].map(ano => (
                <FormControlLabel
                  key={ano}
                  control={
                    <Checkbox
                      checked={anosAplicaveis.includes(ano)}
                      onChange={() => handleAnoChange(ano)}
                    />
                  }
                  label={`${ano}º ano`}
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {editingItem ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default DiagnosticoItens;
