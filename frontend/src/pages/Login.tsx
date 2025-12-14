import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, senha });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: ['100vh', '100dvh'], // Dynamic viewport height for mobile
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%)',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Paper 
        sx={{ 
          p: { xs: 3, sm: 4 }, 
          width: '100%',
          maxWidth: { xs: '100%', sm: 420 },
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Logo/Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box 
            sx={{ 
              width: { xs: 200, sm: 150 },
              height: { xs: 200, sm: 150 },
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 0 15px -3px rgba(59, 130, 246, 0.3)',
              overflow: 'hidden',
            }}
          >
            <img 
              src="/favicon.svg" 
              alt="EDUCA+ Logo"
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
          </Box>
          
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            sx={{ 
              mt: 0.5,
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }}
          >
            Sistema de Gerenciamento Educacional
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoFocus
            autoComplete="email"
            InputProps={{
              sx: { 
                borderRadius: 2,
                fontSize: '16px', // Previne zoom no iOS
              },
            }}
          />
          <TextField
            fullWidth
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            InputProps={{
              sx: { 
                borderRadius: 2,
                fontSize: '16px', // Previne zoom no iOS
              },
            }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ 
              mt: 3,
              py: 1.5,
              borderRadius: 2,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                boxShadow: '0 6px 20px 0 rgba(59, 130, 246, 0.5)',
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        
        {/* Versão/PWA info */}
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block', 
            textAlign: 'center', 
            mt: 3,
            fontSize: '0.75rem',
          }}
        >
          v1.0.0 • Secretaria Municipal de Educação
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;
