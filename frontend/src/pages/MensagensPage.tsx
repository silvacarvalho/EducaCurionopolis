import React from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Paper,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';
const MensagensPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Box>
      <AppBarWithUserMenu title="Gestão de Mensagens" showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Sistema de Mensagens
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Módulo de Mensagens em desenvolvimento. Aqui você poderá enviar mensagens individuais, por escola ou broadcast.
          </Alert>
        </Paper>
      </Container>
    </Box>
  );
};

export default MensagensPage;
