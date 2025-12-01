/**
 * Message View Dialog
 * Dialog for viewing message details and thread
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Reply as ReplyIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { mensagensAPI } from '../../services/api';
import { Mensagem, PrioridadeMensagem } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MessageViewDialogProps {
  open: boolean;
  onClose: () => void;
  message: Mensagem | null;
  onReply?: (message: Mensagem) => void;
  onDelete?: (id: number) => void;
}

const prioridadeColors: Record<PrioridadeMensagem, 'success' | 'info' | 'warning' | 'error'> = {
  [PrioridadeMensagem.BAIXA]: 'success',
  [PrioridadeMensagem.NORMAL]: 'info',
  [PrioridadeMensagem.ALTA]: 'warning',
  [PrioridadeMensagem.URGENTE]: 'error',
};

const prioridadeLabels: Record<PrioridadeMensagem, string> = {
  [PrioridadeMensagem.BAIXA]: 'Baixa',
  [PrioridadeMensagem.NORMAL]: 'Normal',
  [PrioridadeMensagem.ALTA]: 'Alta',
  [PrioridadeMensagem.URGENTE]: 'Urgente',
};

export const MessageViewDialog: React.FC<MessageViewDialogProps> = ({
  open,
  onClose,
  message,
  onReply,
  onDelete,
}) => {
  const [thread, setThread] = useState<Mensagem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && message) {
      loadThread();
    }
  }, [open, message]);

  const loadThread = async () => {
    if (!message) return;
    
    // Check if message has a parent or is part of a thread
    if (message.mensagem_pai_id || message.respostas?.length) {
      setLoading(true);
      try {
        const response = await mensagensAPI.getThread(message.id);
        setThread(response.data);
      } catch (error) {
        console.error('Error loading thread:', error);
        setThread(null);
      } finally {
        setLoading(false);
      }
    } else {
      setThread(null);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  const handleReply = () => {
    if (message) {
      onReply?.(message);
    }
  };

  const handleDelete = async () => {
    if (message && window.confirm('Deseja realmente excluir esta mensagem?')) {
      try {
        await mensagensAPI.delete(message.id);
        onDelete?.(message.id);
        onClose();
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  if (!message) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" component="span">
            {message.assunto}
          </Typography>
          {message.prioridade && message.prioridade !== PrioridadeMensagem.NORMAL && (
            <Chip
              label={prioridadeLabels[message.prioridade]}
              color={prioridadeColors[message.prioridade]}
              size="small"
              sx={{ ml: 1 }}
            />
          )}
          {message.broadcast && (
            <Chip label="Broadcast" color="secondary" size="small" sx={{ ml: 1 }} />
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Message Header */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  <strong>De:</strong> {message.remetente?.nome_completo || 'Desconhecido'}
                  {message.remetente?.email && ` <${message.remetente.email}>`}
                </Typography>
              </Box>
              {message.destinatario && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Para:</strong> {message.destinatario.nome_completo}
                    {message.destinatario.email && ` <${message.destinatario.email}>`}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatDate(message.created_at)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Message Body */}
            <Typography
              variant="body1"
              sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            >
              {message.corpo}
            </Typography>

            {/* Thread Replies */}
            {thread?.respostas && thread.respostas.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Respostas ({thread.respostas.length})
                </Typography>
                {thread.respostas.map((reply) => (
                  <Paper
                    key={reply.id}
                    variant="outlined"
                    sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2">
                        {reply.remetente?.nome_completo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(reply.created_at)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {reply.corpo}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleDelete}
          color="error"
          startIcon={<DeleteIcon />}
        >
          Excluir
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>Fechar</Button>
        <Button
          onClick={handleReply}
          variant="contained"
          startIcon={<ReplyIcon />}
        >
          Responder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageViewDialog;
