import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  Container,
  Paper,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Settings as SettingsIcon } from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { saebV2API } from '../services/api';
import { ConfiguracaoSAEB } from '../types';
import { useNotification } from '../contexts/NotificationContext';

const SAEBV2ConfiguracoesPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSAEB[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAno, setEditingAno] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ questoes_por_bloco: 0, descricao: '' });
  const [creatingConfigs, setCreatingConfigs] = useState(false);

  useEffect(() => {
    loadConfiguracoes();
  }, []);

  const loadConfiguracoes = async () => {
    try {
      setLoading(true);
      const response = await saebV2API.listConfiguracoes();
      setConfiguracoes(response.data);
    } catch (err: any) {
      showNotification(err.response?.data?.detail || 'Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: ConfiguracaoSAEB) => {
    setEditingAno(config.ano_escolar);
    setEditForm({
      questoes_por_bloco: config.questoes_por_bloco,
      descricao: config.descricao || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingAno(null);
    setEditForm({ questoes_por_bloco: 0, descricao: '' });
  };

  const handleSave = async (anoEscolar: number) => {
    try {
      await saebV2API.updateConfiguracao(anoEscolar, editForm);
      showNotification('Configuração atualizada com sucesso!', 'success');
      setEditingAno(null);
      await loadConfiguracoes();
    } catch (err: any) {
      showNotification(err.response?.data?.detail || 'Erro ao atualizar configuração', 'error');
    }
  };

  const handleCreateDefaultConfigs = async () => {
    try {
      setCreatingConfigs(true);
      
      // Criar configuração para 5º ano
      await saebV2API.createConfiguracao({
        ano_escolar: 5,
        questoes_por_bloco: 11,
        descricao: 'Configuração para 5º ano do Ensino Fundamental',
      });

      // Criar configuração para 9º ano
      await saebV2API.createConfiguracao({
        ano_escolar: 9,
        questoes_por_bloco: 13,
        descricao: 'Configuração para 9º ano do Ensino Fundamental',
      });

      showNotification('Configurações criadas com sucesso!', 'success');
      await loadConfiguracoes();
    } catch (err: any) {
      showNotification(err.response?.data?.detail || 'Erro ao criar configurações', 'error');
    } finally {
      setCreatingConfigs(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="SAEB V2 - Configurações">
        <Box sx={{ width: '100%', height: '100%' }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="SAEB V2 - Configurações">
      <Container maxWidth="xl">
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <SettingsIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Configurações SAEB V2
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure a quantidade de questões por bloco para cada ano escolar
            </Typography>
          </Box>
        </Box>

        {configuracoes.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: 'grey.50',
              border: '2px dashed',
              borderColor: 'grey.300',
            }}
          >
            <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Nenhuma configuração cadastrada
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Para começar a usar o sistema SAEB V2, é necessário criar as configurações padrão
              para os anos escolares (5º e 9º ano).
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleCreateDefaultConfigs}
              disabled={creatingConfigs}
              startIcon={creatingConfigs ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {creatingConfigs ? 'Criando configurações...' : 'Criar Configurações Padrão'}
            </Button>
            <Box sx={{ mt: 4, p: 3, bgcolor: 'info.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>As configurações padrão incluem:</strong><br />
                • 5º Ano: 11 questões por bloco<br />
                • 9º Ano: 13 questões por bloco<br />
                (Você poderá editar estes valores depois)
              </Typography>
            </Box>
          </Paper>
        ) : (
          <>
            <Grid container spacing={3}>
          {configuracoes.map((config) => (
            <Grid item xs={12} md={6} key={config.id}>
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {config.ano_escolar}º Ano
                    </Typography>
                    {editingAno === config.ano_escolar ? (
                      <Box>
                        <IconButton
                          color="primary"
                          onClick={() => handleSave(config.ano_escolar)}
                          size="small"
                          sx={{
                            mr: 1,
                            '&:hover': { bgcolor: 'success.50' },
                          }}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          onClick={handleCancelEdit}
                          size="small"
                          sx={{
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(config)}
                        size="small"
                        sx={{
                          '&:hover': { bgcolor: 'primary.50' },
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                  </Box>

                  {editingAno === config.ano_escolar ? (
                    <Box>
                      <TextField
                        fullWidth
                        label="Questões por Bloco"
                        type="number"
                        value={editForm.questoes_por_bloco}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            questoes_por_bloco: parseInt(e.target.value) || 0,
                          })
                        }
                        inputProps={{ min: 1, max: 50 }}
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { borderRadius: 2 },
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Descrição"
                        multiline
                        rows={2}
                        value={editForm.descricao}
                        onChange={(e) =>
                          setEditForm({ ...editForm, descricao: e.target.value })
                        }
                        InputProps={{
                          sx: { borderRadius: 2 },
                        }}
                      />
                    </Box>
                  ) : (
                    <Box>
                      <Paper
                        sx={{
                          p: 2,
                          mb: 2,
                          bgcolor: 'primary.50',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'primary.light',
                        }}
                      >
                        <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'center' }}>
                          {config.questoes_por_bloco}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                          questões por bloco
                        </Typography>
                      </Paper>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {config.descricao || 'Sem descrição'}
                      </Typography>
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        <Typography variant="caption">
                          <strong>Total por simulado:</strong> {config.questoes_por_bloco * 4} questões<br />
                          (2 disciplinas × 2 blocos × {config.questoes_por_bloco})
                        </Typography>
                      </Alert>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 2,
            bgcolor: 'info.50',
            border: '1px solid',
            borderColor: 'info.light',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'info.main' }}>
            Informações sobre a Estrutura SAEB
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Cada simulado SAEB contém questões de <strong>Português</strong> e <strong>Matemática</strong>
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Cada disciplina possui <strong>2 blocos</strong> de questões (Bloco 1 e Bloco 2)
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              O total de questões é calculado: <strong>Questões/Bloco × 2 blocos × 2 disciplinas</strong>
            </Typography>
            <Typography component="li" variant="body2">
              Exemplo: 11 questões/bloco = <strong>44 questões totais</strong> no simulado
            </Typography>
          </Box>
        </Paper>
        </>
        )}
      </Container>
    </MainLayout>
  );
};

export default SAEBV2ConfiguracoesPage;
