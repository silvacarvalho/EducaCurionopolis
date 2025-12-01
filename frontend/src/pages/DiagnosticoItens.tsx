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
  Container,
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
import { Add, Edit, Delete, ArrowBack as ArrowBackIcon, } from '@mui/icons-material';
import { diagnosticosAPI } from '../services/api';
import { ItemDiagnostico, ModalidadeDiagnostico } from '../types';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';


const DiagnosticoItens: React.FC = () => {
  const [itens, setItens] = useState<ItemDiagnostico[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemDiagnostico | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const getModalidadeLabel = (mod: ModalidadeDiagnostico) => {
    return mod === ModalidadeDiagnostico.LEITURA ? 'Leitura' : 'Escrita';
  };

  const getModalidadeColor = (mod: ModalidadeDiagnostico) => {
    return mod === ModalidadeDiagnostico.LEITURA ? 'primary' : 'secondary';
  };

  return (
    
    <Box>
      <AppBarWithUserMenu title="Gestão de Itens de Diagnóstico" showBackButton />
      <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Itens de Diagnóstico</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Novo Item
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Modalidade</TableCell>
                <TableCell>Anos Aplicáveis</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id}>
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
    </Container>
  </Box>
  );
};

export default DiagnosticoItens;
