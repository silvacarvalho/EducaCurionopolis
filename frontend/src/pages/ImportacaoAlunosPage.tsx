import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  WarningAmber,
  Close,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { Turma } from '../types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ResultadoImportacao {
  total: number;
  sucesso: number;
  erros: number;
  detalhes_erros: Array<{
    linha: number;
    erro: string;
  }>;
}

const ImportacaoAlunosPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<number | ''>('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Baixar Template', 'Selecionar Turma', 'Upload do Arquivo', 'Resultado'];

  useEffect(() => {
    loadTurmas();
  }, []);

  const loadTurmas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await axios.get('/api/v1/turmas/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.length === 0) {
        setError('Nenhuma turma cadastrada. Cadastre turmas antes de importar alunos.');
      }
      
      setTurmas(response.data);
    } catch (err: any) {
      console.error('Erro ao carregar turmas:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar turmas. Verifique se há turmas cadastradas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await axios.get('/api/v1/importacao/template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Criar download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_importacao_alunos_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess('Template baixado com sucesso!');
      setActiveStep(1);
    } catch (err: any) {
      console.error('Erro ao baixar template:', err);
      setError(err.response?.data?.detail || 'Erro ao baixar template');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Validar extensão
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Arquivo deve ser Excel (.xlsx ou .xls)');
        return;
      }

      setArquivo(file);
      setError('');
      setActiveStep(2);
    }
  };

  const handleUpload = async () => {
    if (!arquivo || !turmaSelecionada) {
      setError('Selecione uma turma e um arquivo');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', arquivo);

      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `http://localhost:8000/api/v1/importacao/alunos?turma_id=${turmaSelecionada}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setResultado(response.data.resultados);
      setSuccess(response.data.mensagem);
      setActiveStep(3);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao importar alunos');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setArquivo(null);
    setTurmaSelecionada('');
    setResultado(null);
    setError('');
    setSuccess('');
    setActiveStep(0);
  };

  return (
    <MainLayout title="Importação de Alunos">
      <Box sx={{ width: '100%', height: '100%' }}>
        {/* Stepper */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* Alertas */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* PASSO 1: Baixar Template */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              1. Baixar Template Excel
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Baixe o template, preencha com os dados dos alunos e salve o arquivo.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadTemplate}
              disabled={loading}
            >
              Baixar Template
            </Button>
          </CardContent>
        </Card>

        {/* PASSO 2: Selecionar Turma */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Selecionar Turma
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Escolha a turma para a qual os alunos serão importados.
            </Typography>
            
            {turmas.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="medium">
                  Nenhuma turma cadastrada
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Você precisa cadastrar turmas antes de importar alunos. 
                  Acesse a página de <strong>Turmas e Alunos</strong> para criar uma turma.
                </Typography>
              </Alert>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={turmaSelecionada}
                  onChange={(e) => {
                    setTurmaSelecionada(e.target.value as number);
                    if (e.target.value) setActiveStep(Math.max(activeStep, 1));
                  }}
                  label="Turma"
                >
                  {turmas.map((turma) => (
                    <MenuItem key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.ano_escolar}º Ano - {turma.turno}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </CardContent>
        </Card>

        {/* PASSO 3: Upload do Arquivo */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              3. Fazer Upload do Arquivo
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Selecione o arquivo Excel preenchido para importação.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                disabled={!turmaSelecionada}
              >
                Selecionar Arquivo
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </Button>

              {arquivo && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={arquivo.name}
                    onDelete={() => setArquivo(null)}
                    color="primary"
                  />
                </Box>
              )}
            </Box>

            {arquivo && turmaSelecionada && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpload}
                  disabled={uploading}
                  fullWidth
                >
                  {uploading ? 'Importando...' : 'Importar Alunos'}
                </Button>
                {uploading && <LinearProgress sx={{ mt: 2 }} />}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* PASSO 4: Resultado */}
        {resultado && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                4. Resultado da Importação
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Chip
                  icon={<CheckCircle />}
                  label={`${resultado.sucesso} importados`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<Error />}
                  label={`${resultado.erros} erros`}
                  color="error"
                  variant="outlined"
                />
                <Chip
                  label={`${resultado.total} total`}
                  variant="outlined"
                />
              </Box>

              {resultado.detalhes_erros && resultado.detalhes_erros.length > 0 && (
                <>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Detalhes dos Erros:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Linha</TableCell>
                          <TableCell>Erro</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resultado.detalhes_erros.map((erro, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{erro.linha}</TableCell>
                            <TableCell>{erro.erro}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              <Box sx={{ mt: 3 }}>
                <Button variant="outlined" onClick={handleReset}>
                  Nova Importação
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </MainLayout>
  );
};

export default ImportacaoAlunosPage;
