import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { usuariosAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { PerfilUsuario } from '../types';
import MainLayout from '../components/layout/MainLayout';

const GestoresPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<PerfilUsuario>(PerfilUsuario.GESTAO_MUNICIPAL);
  const [loading, setLoading] = useState(false);
  const [gestores, setGestores] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const loadGestores = async () => {
    try {
      setLoadingList(true);
      const resp = await usuariosAPI.list({ perfil: PerfilUsuario.GESTAO_MUNICIPAL });
      setGestores(resp.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadGestores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf || !nome || !email || !senha) {
      showNotification('Preencha CPF, nome, e-mail e senha', 'warning');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        cpf,
        nome_completo: nome,
        email,
        telefone,
        perfil,
        senha,
      };
      await usuariosAPI.create(payload);
      showNotification('Gestor criado com sucesso', 'success');
      // reset
      setCpf('');
      setNome('');
      setEmail('');
      setTelefone('');
      setSenha('');
      loadGestores();
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.detail || 'Erro ao criar gestor';
      showNotification(detail, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Gestores">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Cadastro de Gestores</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Senha temporária" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Perfil</InputLabel>
              <Select value={perfil} label="Perfil" onChange={(e) => setPerfil(e.target.value as PerfilUsuario)}>
                <MenuItem value={PerfilUsuario.GESTAO_MUNICIPAL}>Gestão Municipal</MenuItem>
                <MenuItem value={PerfilUsuario.DIRETOR_COORDENADOR}>Diretor/Coordenador</MenuItem>
                <MenuItem value={PerfilUsuario.PROFESSOR}>Professor</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Cadastrar Gestor'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      {/* Lista de gestores */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Gestores Cadastrados</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>CPF</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gestores.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.nome_completo}</TableCell>
                <TableCell>{g.cpf}</TableCell>
                <TableCell>{g.email}</TableCell>
                <TableCell>{g.telefone || '-'}</TableCell>
                <TableCell>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => setEditing(g)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton size="small" onClick={() => setDeleteTarget(g)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Gestor</DialogTitle>
        <DialogContent>
          {editing && (
            <Box sx={{ mt: 1 }}>
              <TextField label="Nome completo" fullWidth sx={{ mb: 2 }} value={editing.nome_completo} onChange={(e) => setEditing({ ...editing, nome_completo: e.target.value })} />
              <TextField label="E-mail" fullWidth sx={{ mb: 2 }} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              <TextField label="Telefone" fullWidth sx={{ mb: 2 }} value={editing.telefone || ''} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!editing) return;
              try {
                await usuariosAPI.update(editing.id, {
                  nome_completo: editing.nome_completo,
                  email: editing.email,
                  telefone: editing.telefone,
                });
                showNotification('Gestor atualizado', 'success');
                setEditing(null);
                loadGestores();
              } catch (err: any) {
                console.error(err);
                showNotification(err?.response?.data?.detail || 'Erro ao atualizar', 'error');
              }
            }}
            variant="contained"
          >Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja desativar este gestor? Essa ação pode ser revertida.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await usuariosAPI.delete(deleteTarget.id);
                showNotification('Gestor desativado', 'success');
                setDeleteTarget(null);
                loadGestores();
              } catch (err: any) {
                console.error(err);
                showNotification(err?.response?.data?.detail || 'Erro ao excluir', 'error');
              }
            }}
          >Excluir</Button>
        </DialogActions>
      </Dialog>
      </Paper>
    </MainLayout>
  );
};

export default GestoresPage;
