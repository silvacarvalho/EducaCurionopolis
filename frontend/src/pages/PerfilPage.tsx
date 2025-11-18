import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';

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
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PerfilPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile data
  const [profileData, setProfileData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
  });

  // Password data
  const [passwordData, setPasswordData] = useState({
    senha_atual: '',
    senha_nova: '',
    senha_confirmacao: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        nome_completo: user.nome_completo,
        email: user.email,
        telefone: user.telefone || '',
      });
    }
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.put(`/usuarios/${user?.id}`, {
        nome_completo: profileData.nome_completo,
        email: profileData.email,
        telefone: profileData.telefone || null,
      });

      // Update user in context
      updateUser(response.data);

      setSuccess('Perfil atualizado com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate passwords match
      if (passwordData.senha_nova !== passwordData.senha_confirmacao) {
        setError('As senhas não coincidem');
        setLoading(false);
        return;
      }

      // Validate password length
      if (passwordData.senha_nova.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres');
        setLoading(false);
        return;
      }

      await api.post('/usuarios/change-password', {
        senha_atual: passwordData.senha_atual,
        senha_nova: passwordData.senha_nova,
      });

      setSuccess('Senha alterada com sucesso!');
      setPasswordData({
        senha_atual: '',
        senha_nova: '',
        senha_confirmacao: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const getPerfilLabel = (perfil: string) => {
    const labels: { [key: string]: string } = {
      gestao_municipal: 'Gestão Municipal',
      diretor_coordenador: 'Diretor/Coordenador',
      professor: 'Professor',
      comunidade: 'Comunidade',
    };
    return labels[perfil] || perfil;
  };

  if (!user) {
    return null;
  }

  return (
    <Box>
      <AppBarWithUserMenu title="Meu Perfil" showBackButton />

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          {/* User Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                fontSize: '2rem',
              }}
            >
              {user.nome_completo.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ ml: 3 }}>
              <Typography variant="h5">{user.nome_completo}</Typography>
              <Typography variant="body2" color="text.secondary">
                {getPerfilLabel(user.perfil)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CPF: {user.cpf}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab
                icon={<PersonIcon />}
                iconPosition="start"
                label="Dados Pessoais"
              />
              <Tab
                icon={<LockIcon />}
                iconPosition="start"
                label="Alterar Senha"
              />
            </Tabs>
          </Box>

          {/* Personal Data Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Nome Completo"
                  fullWidth
                  value={profileData.nome_completo}
                  onChange={(e) =>
                    setProfileData({ ...profileData, nome_completo: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefone"
                  fullWidth
                  value={profileData.telefone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, telefone: e.target.value })
                  }
                  placeholder="(94) 99999-9999"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="CPF"
                  fullWidth
                  value={user.cpf}
                  disabled
                  helperText="O CPF não pode ser alterado"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Perfil"
                  fullWidth
                  value={getPerfilLabel(user.perfil)}
                  disabled
                  helperText="O perfil não pode ser alterado"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setProfileData({
                        nome_completo: user.nome_completo,
                        email: user.email,
                        telefone: user.telefone || '',
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleProfileUpdate}
                    disabled={loading}
                  >
                    Salvar Alterações
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Password Change Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info">
                  A senha deve ter no mínimo 6 caracteres.
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Senha Atual"
                  type="password"
                  fullWidth
                  value={passwordData.senha_atual}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, senha_atual: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nova Senha"
                  type="password"
                  fullWidth
                  value={passwordData.senha_nova}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, senha_nova: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Confirmar Nova Senha"
                  type="password"
                  fullWidth
                  value={passwordData.senha_confirmacao}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      senha_confirmacao: e.target.value,
                    })
                  }
                  required
                  error={
                    passwordData.senha_confirmacao !== '' &&
                    passwordData.senha_nova !== passwordData.senha_confirmacao
                  }
                  helperText={
                    passwordData.senha_confirmacao !== '' &&
                    passwordData.senha_nova !== passwordData.senha_confirmacao
                      ? 'As senhas não coincidem'
                      : ''
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setPasswordData({
                        senha_atual: '',
                        senha_nova: '',
                        senha_confirmacao: '',
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePasswordChange}
                    disabled={
                      loading ||
                      !passwordData.senha_atual ||
                      !passwordData.senha_nova ||
                      passwordData.senha_nova !== passwordData.senha_confirmacao
                    }
                  >
                    Alterar Senha
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>
        </Paper>
      </Container>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PerfilPage;
