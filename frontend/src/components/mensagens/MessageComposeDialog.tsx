/**
 * Message Compose Dialog
 * Dialog for composing and sending messages
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Send as SendIcon, Close as CloseIcon } from '@mui/icons-material';
import { mensagensAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Destinatario, PrioridadeMensagem, Mensagem, PerfilUsuario } from '../../types';

interface MessageComposeDialogProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  replyTo?: Mensagem;
}

const prioridadeColors: Record<PrioridadeMensagem, string> = {
  [PrioridadeMensagem.BAIXA]: '#4caf50',
  [PrioridadeMensagem.NORMAL]: '#2196f3',
  [PrioridadeMensagem.ALTA]: '#ff9800',
  [PrioridadeMensagem.URGENTE]: '#f44336',
};

const prioridadeLabels: Record<PrioridadeMensagem, string> = {
  [PrioridadeMensagem.BAIXA]: 'Baixa',
  [PrioridadeMensagem.NORMAL]: 'Normal',
  [PrioridadeMensagem.ALTA]: 'Alta',
  [PrioridadeMensagem.URGENTE]: 'Urgente',
};

export const MessageComposeDialog: React.FC<MessageComposeDialogProps> = ({
  open,
  onClose,
  onSent,
  replyTo,
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [selectedDestinatarios, setSelectedDestinatarios] = useState<Destinatario[]>([]);
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeMensagem>(PrioridadeMensagem.NORMAL);
  const [broadcastTodos, setBroadcastTodos] = useState(false);
  const [broadcastDiretores, setBroadcastDiretores] = useState(false);
  const [broadcastProfessores, setBroadcastProfessores] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGestaoMunicipal = user?.perfil === PerfilUsuario.GESTAO_MUNICIPAL;
  const isDiretor = user?.perfil === PerfilUsuario.DIRETOR_COORDENADOR;

  useEffect(() => {
    if (open) {
      loadDestinatarios();
      if (replyTo) {
        setAssunto(`Re: ${replyTo.assunto}`);
        setCorpo(`\n\n---\nEm resposta a:\n${replyTo.corpo}`);
      } else {
        setAssunto('');
        setCorpo('');
      }
      setError(null);
      setBroadcastTodos(false);
      setBroadcastDiretores(false);
      setBroadcastProfessores(false);
    }
  }, [open, replyTo]);

  const loadDestinatarios = async () => {
    setLoadingDestinatarios(true);
    try {
      const response = await mensagensAPI.getDestinatarios();
      setDestinatarios(response.data);
      
      // If replying, pre-select the original sender
      if (replyTo && replyTo.remetente) {
        const sender = response.data.find((d: Destinatario) => d.id === replyTo.remetente_id);
        if (sender) {
          setSelectedDestinatarios([sender]);
        }
      }
    } catch (err) {
      console.error('Error loading destinatarios:', err);
      setError('Erro ao carregar destinatários');
    } finally {
      setLoadingDestinatarios(false);
    }
  };

  const handleSubmit = async () => {
    if (!assunto.trim()) {
      setError('Assunto é obrigatório');
      return;
    }
    if (!corpo.trim()) {
      setError('Mensagem é obrigatória');
      return;
    }

    const isBroadcast = broadcastTodos || broadcastDiretores || broadcastProfessores;
    if (!isBroadcast && selectedDestinatarios.length === 0) {
      setError('Selecione pelo menos um destinatário');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messageData = {
        assunto: assunto.trim(),
        corpo: corpo.trim(),
        prioridade,
        mensagem_pai_id: replyTo?.id,
      };

      if (broadcastTodos && isGestaoMunicipal) {
        await mensagensAPI.broadcastTodos(messageData);
        showNotification('Mensagem enviada para todos os usuários', 'success');
      } else if (broadcastDiretores && isGestaoMunicipal) {
        await mensagensAPI.broadcastDiretores(messageData);
        showNotification('Mensagem enviada para todos os diretores', 'success');
      } else if (broadcastProfessores && (isGestaoMunicipal || isDiretor)) {
        await mensagensAPI.broadcastProfessores(messageData);
        showNotification('Mensagem enviada para todos os professores', 'success');
      } else if (selectedDestinatarios.length === 1) {
        await mensagensAPI.send({
          ...messageData,
          destinatario_id: selectedDestinatarios[0].id,
        });
        showNotification('Mensagem enviada com sucesso', 'success');
      } else {
        await mensagensAPI.send({
          ...messageData,
          destinatario_ids: selectedDestinatarios.map((d) => d.id),
        });
        showNotification(`Mensagem enviada para ${selectedDestinatarios.length} destinatários`, 'success');
      }

      onSent?.();
      handleClose();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.detail || 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDestinatarios([]);
    setAssunto('');
    setCorpo('');
    setPrioridade(PrioridadeMensagem.NORMAL);
    setBroadcastTodos(false);
    setBroadcastDiretores(false);
    setBroadcastProfessores(false);
    setError(null);
    onClose();
  };

  const handleBroadcastChange = (type: 'todos' | 'diretores' | 'professores') => {
    if (type === 'todos') {
      setBroadcastTodos(!broadcastTodos);
      setBroadcastDiretores(false);
      setBroadcastProfessores(false);
      setSelectedDestinatarios([]);
    } else if (type === 'diretores') {
      setBroadcastDiretores(!broadcastDiretores);
      setBroadcastTodos(false);
      setBroadcastProfessores(false);
      setSelectedDestinatarios([]);
    } else if (type === 'professores') {
      setBroadcastProfessores(!broadcastProfessores);
      setBroadcastTodos(false);
      setBroadcastDiretores(false);
      setSelectedDestinatarios([]);
    }
  };

  const isBroadcastSelected = broadcastTodos || broadcastDiretores || broadcastProfessores;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {replyTo ? 'Responder Mensagem' : 'Nova Mensagem'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Broadcast Options */}
          {(isGestaoMunicipal || isDiretor) && !replyTo && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {isGestaoMunicipal && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={broadcastTodos}
                        onChange={() => handleBroadcastChange('todos')}
                        color="error"
                      />
                    }
                    label={
                      <Typography variant="body2" color="error">
                        Enviar para TODOS
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={broadcastDiretores}
                        onChange={() => handleBroadcastChange('diretores')}
                        color="primary"
                      />
                    }
                    label="Todos os Diretores"
                  />
                </>
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={broadcastProfessores}
                    onChange={() => handleBroadcastChange('professores')}
                    color="secondary"
                  />
                }
                label={isDiretor ? 'Professores da Escola' : 'Todos os Professores'}
              />
            </Box>
          )}

          {/* Recipients */}
          {!isBroadcastSelected && (
            <Autocomplete
              multiple
              options={destinatarios}
              getOptionLabel={(option) => `${option.nome_completo} (${option.escola_nome || option.perfil})`}
              value={selectedDestinatarios}
              onChange={(_, newValue) => setSelectedDestinatarios(newValue)}
              loading={loadingDestinatarios}
              disabled={replyTo !== undefined}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Destinatários"
                  placeholder="Selecione os destinatários"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingDestinatarios ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.nome_completo}
                    size="small"
                  />
                ))
              }
              groupBy={(option) => option.perfil}
            />
          )}

          {/* Priority */}
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as PrioridadeMensagem)}
              label="Prioridade"
            >
              {Object.entries(prioridadeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: prioridadeColors[value as PrioridadeMensagem],
                      }}
                    />
                    {label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Subject */}
          <TextField
            label="Assunto"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            fullWidth
            required
          />

          {/* Body */}
          <TextField
            label="Mensagem"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            fullWidth
            required
            multiline
            rows={8}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<CloseIcon />} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageComposeDialog;