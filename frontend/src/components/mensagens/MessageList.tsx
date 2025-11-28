/**
 * Message List Component
 * Displays a list of messages (inbox or sent)
 */
import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Checkbox,
  Skeleton,
} from '@mui/material';
import {
  Mail as MailIcon,
  PriorityHigh as UrgentIcon,
  ArrowUpward as HighIcon,
  ArrowDownward as LowIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Mensagem, PrioridadeMensagem } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MessageListProps {
  messages: Mensagem[];
  loading?: boolean;
  onSelect: (message: Mensagem) => void;
  onDelete?: (id: number) => void;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  showRecipient?: boolean; // true for sent messages
}

const prioridadeIcons: Record<PrioridadeMensagem, React.ReactNode> = {
  [PrioridadeMensagem.BAIXA]: <LowIcon fontSize="small" color="success" />,
  [PrioridadeMensagem.NORMAL]: null,
  [PrioridadeMensagem.ALTA]: <HighIcon fontSize="small" color="warning" />,
  [PrioridadeMensagem.URGENTE]: <UrgentIcon fontSize="small" color="error" />,
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading = false,
  onSelect,
  onDelete,
  selectedIds = [],
  onToggleSelect,
  showRecipient = false,
}) => {
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <List>
        {[1, 2, 3, 4, 5].map((i) => (
          <ListItem key={i} divider>
            <ListItemAvatar>
              <Skeleton variant="circular" width={40} height={40} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton width="60%" />}
              secondary={<Skeleton width="80%" />}
            />
          </ListItem>
        ))}
      </List>
    );
  }

  if (messages.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <MailIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
        <Typography color="text.secondary">
          {showRecipient ? 'Nenhuma mensagem enviada' : 'Caixa de entrada vazia'}
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {messages.map((message) => {
        const person = showRecipient ? message.destinatario : message.remetente;
        const isUnread = !showRecipient && !message.lida;

        return (
          <ListItem
            key={message.id}
            divider
            sx={{
              cursor: 'pointer',
              bgcolor: isUnread ? 'action.hover' : 'transparent',
              '&:hover': {
                bgcolor: 'action.selected',
              },
            }}
            onClick={() => onSelect(message)}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {prioridadeIcons[message.prioridade]}
                {onDelete && (
                  <Tooltip title="Excluir">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(message.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            }
          >
            {onToggleSelect && (
              <Checkbox
                checked={selectedIds.includes(message.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(message.id);
                }}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{ mr: 1 }}
              />
            )}
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: isUnread ? 'primary.main' : 'grey.400' }}>
                {person ? getInitials(person.nome_completo) : '?'}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: isUnread ? 700 : 400 }}
                  >
                    {person?.nome_completo || 'Desconhecido'}
                  </Typography>
                  {message.broadcast && (
                    <Chip label="Broadcast" size="small" color="secondary" />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isUnread ? 600 : 400,
                      color: isUnread ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {message.assunto}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '400px',
                    }}
                  >
                    {message.corpo.substring(0, 100)}
                    {message.corpo.length > 100 && '...'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {formatDate(message.created_at)}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
};

export default MessageList;
