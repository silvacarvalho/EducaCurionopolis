/**
 * SAEB V2 - Aluno Login Page
 * Public page where students authenticate using only a 6-character token
 * No user account required - token identifies student, simulado, and turma
 */
import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent,
} from '@mui/material';
import {
  VpnKey as TokenIcon,
  School as SchoolIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { saebV2API } from '../services/api';
import { TokenAuthResponse } from '../types';

const SAEBV2AlunoLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase and limit to 6 characters
    const value = e.target.value.toUpperCase().slice(0, 6);
    setToken(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (token.length !== 6) {
      setError('O token deve ter exatamente 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await saebV2API.autenticarComToken(token);
      const authData: TokenAuthResponse = response.data;

      // Store token and student info
      localStorage.setItem('access_token', authData.access_token);
      localStorage.setItem('student_session', JSON.stringify({
        aluno_id: authData.aluno_id,
        aluno_nome: authData.aluno_nome,
        simulado_id: authData.simulado_id,
        simulado_nome: authData.simulado_nome,
        token: token,
      }));

      // Redirect to student simulado list page
      navigate('/saeb-v2/aluno');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.status === 404) {
        setError('Token não encontrado ou inválido');
      } else if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Token inválido');
      } else if (err.response?.status === 403) {
        setError('Token expirado ou já utilizado');
      } else {
        setError('Erro ao conectar com o servidor. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SchoolIcon sx={{ fontSize: 64, color: 'white', mb: 2 }} />
          <Typography variant="h3" color="white" fontWeight="bold" gutterBottom>
            EDUCA+ Curionópolis
          </Typography>
          <Typography variant="h6" color="white" sx={{ opacity: 0.9 }}>
            Simulado SAEB - Acesso do Aluno
          </Typography>
        </Box>

        {/* Login Card */}
        <Paper elevation={8} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <TokenIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Digite seu Token de Acesso
            </Typography>
            <Typography variant="body2" color="text.secondary">
              O token foi fornecido pelo seu professor
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="ABC123"
              value={token}
              onChange={handleTokenChange}
              disabled={loading}
              autoFocus
              inputProps={{
                maxLength: 6,
                style: {
                  textAlign: 'center',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.5rem',
                  textTransform: 'uppercase',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TokenIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || token.length !== 6}
              sx={{ py: 1.5, fontSize: '1.1rem' }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Verificando...
                </>
              ) : (
                'Acessar Simulado'
              )}
            </Button>
          </form>
        </Paper>

        {/* Info Card */}
        <Card sx={{ mt: 3, bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <InfoIcon color="info" />
              <Typography variant="subtitle2" fontWeight="bold">
                Sobre o Token de Acesso
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              • O token tem <strong>6 caracteres</strong> (letras e números)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • É <strong>único</strong> e <strong>pessoal</strong> - não compartilhe com outros alunos
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Válido apenas para o simulado liberado pelo professor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Caso tenha perdido seu token, solicite ao professor
            </Typography>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
            Prefeitura Municipal de Curionópolis - Secretaria de Educação
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default SAEBV2AlunoLoginPage;
