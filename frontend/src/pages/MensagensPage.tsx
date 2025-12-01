/**
 * Mensagens Page
 * Complete messaging interface with inbox, sent, and compose functionality
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Badge,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Inbox as InboxIcon,
  Send as SendIcon,
  Create as CreateIcon,
  Refresh as RefreshIcon,
  MarkEmailRead as MarkReadIcon,
  Circle as OnlineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../contexts/MessagesContext';
import { useNotification } from '../contexts/NotificationContext';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';
import { MessageList, MessageComposeDialog, MessageViewDialog } from '../components/mensagens';
import { Mensagem, PrioridadeMensagem } from '../types';
import { mensagensAPI } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`messages-tabpanel-${index}`}
      aria-labelledby={`messages-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const MensagensPage: React.FC = () => {
  const { user } = useAuth();
  const {
    unreadCount,
    inbox,
    sent,
    isConnected,
    onlineUsers,
    isLoading,
    refreshInbox,
    refreshSent,
    markAsRead,
    markAllAsRead,
    reconnectWebSocket,
  } = useMessages();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [tabValue, setTabValue] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Mensagem | null>(null);
  const [replyTo, setReplyTo] = useState<Mensagem | undefined>(undefined);
  const [filterPrioridade, setFilterPrioridade] = useState<string>('all');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1) {
      refreshSent();
    }
  };

  const handleSelectMessage = async (message: Mensagem) => {
    setSelectedMessage(message);
    setViewDialogOpen(true);

    // Mark as read if it's in inbox and unread
    if (tabValue === 0 && !message.lida) {
      await markAsRead(message.id);
    }
  };

  const handleReply = (message: Mensagem) => {
    setReplyTo(message);
    setViewDialogOpen(false);
    setComposeOpen(true);
  };

  const handleMessageSent = () => {
    refreshInbox();
    refreshSent();
    setReplyTo(undefined);
  };

  const handleDeleteMessage = async (id: number) => {
    if (window.confirm('Deseja realmente excluir esta mensagem?')) {
      try {
        await mensagensAPI.delete(id);
        showNotification('Mensagem excluída', 'success');
        refreshInbox();
        refreshSent();
      } catch (error) {
        showNotification('Erro ao excluir mensagem', 'error');
      }
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    showNotification('Todas as mensagens foram marcadas como lidas', 'success');
  };

  const filteredInbox = filterPrioridade === 'all'
    ? inbox
    : inbox.filter((m) => m.prioridade === filterPrioridade);

  return (
    <Box>
      <AppBarWithUserMenu title="Mensagens" showBackButton />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5">Caixa de Mensagens</Typography>
              <Tooltip title={isConnected ? 'Conectado em tempo real' : 'Clique para reconectar'}>
                <Chip
                  size="small"
                  icon={<OnlineIcon sx={{ fontSize: 12 }} />}
                  label={isConnected ? 'Online' : 'Desconectado'}
                  color={isConnected ? 'success' : 'default'}
                  variant={isConnected ? 'filled' : 'outlined'}
                  onClick={!isConnected ? reconnectWebSocket : undefined}
                  sx={{ cursor: !isConnected ? 'pointer' : 'default' }}
                />
              </Tooltip>
              {onlineUsers.length > 0 && (
                <Chip
                  size="small"
                  label={`${onlineUsers.length} usuário(s) online`}
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Atualizar">
                <IconButton onClick={() => { refreshInbox(); refreshSent(); }} disabled={isLoading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {tabValue === 0 && unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<MarkReadIcon />}
                  onClick={handleMarkAllRead}
                >
                  Marcar todas como lidas
                </Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab
                icon={
                  <Badge badgeContent={unreadCount} color="error">
                    <InboxIcon />
                  </Badge>
                }
                iconPosition="start"
                label="Caixa de Entrada"
              />
              <Tab icon={<SendIcon />} iconPosition="start" label="Enviadas" />
            </Tabs>
          </Box>

          {/* Inbox Tab */}
          <TabPanel value={tabValue} index={0}>
            {/* Filter */}
            <Box sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={filterPrioridade}
                  onChange={(e) => setFilterPrioridade(e.target.value)}
                  label="Prioridade"
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value={PrioridadeMensagem.URGENTE}>🔴 Urgente</MenuItem>
                  <MenuItem value={PrioridadeMensagem.ALTA}>🟠 Alta</MenuItem>
                  <MenuItem value={PrioridadeMensagem.NORMAL}>🔵 Normal</MenuItem>
                  <MenuItem value={PrioridadeMensagem.BAIXA}>🟢 Baixa</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <MessageList
              messages={filteredInbox}
              loading={isLoading}
              onSelect={handleSelectMessage}
              onDelete={handleDeleteMessage}
            />
          </TabPanel>

          {/* Sent Tab */}
          <TabPanel value={tabValue} index={1}>
            <MessageList
              messages={sent}
              loading={isLoading}
              onSelect={handleSelectMessage}
              onDelete={handleDeleteMessage}
              showRecipient
            />
          </TabPanel>
        </Paper>
      </Container>

      {/* Compose FAB */}
      <Fab
        color="primary"
        aria-label="Nova mensagem"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => {
          setReplyTo(undefined);
          setComposeOpen(true);
        }}
      >
        <CreateIcon />
      </Fab>

      {/* Compose Dialog */}
      <MessageComposeDialog
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setReplyTo(undefined);
        }}
        onSent={handleMessageSent}
        replyTo={replyTo}
      />

      {/* View Dialog */}
      <MessageViewDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedMessage(null);
        }}
        message={selectedMessage}
        onReply={handleReply}
        onDelete={(id) => {
          handleDeleteMessage(id);
          setViewDialogOpen(false);
        }}
      />
    </Box>
  );
};

export default MensagensPage;
