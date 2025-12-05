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
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';
import { saebV2API } from '../services/api';
import { ConfiguracaoSAEB } from '../types';
import { useNotification } from '../contexts/NotificationContext';

const SAEBV2ConfiguracoesPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSAEB[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAno, setEditingAno] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ questoes_por_bloco: 0, descricao: '' });

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

  if (loading) {
    return (
      <>
        <AppBarWithUserMenu title="SAEB V2 - Configurações" showBackButton />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <AppBarWithUserMenu title="SAEB V2 - Configurações" showBackButton />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
      </Container>
    </>
  );
};

export default SAEBV2ConfiguracoesPage;
