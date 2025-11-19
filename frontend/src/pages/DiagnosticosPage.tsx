/**
 * Gestão de Diagnósticos (GESTÃO MUNICIPAL)
 * Criar diagnósticos e vincular itens
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Paper,
  Chip,
  IconButton,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Step,
  Stepper,
  StepLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Link as LinkIcon,
  Visibility,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { diagnosticosAPI } from '../services/api';
import {
  Diagnostico,
  DiagnosticoCreate,
  TipoDiagnostico,
  Bimestre,
  ItemDiagnostico,
  ModalidadeDiagnostico,
} from '../types';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';

const DiagnosticosPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemDiagnostico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openVincularDialog, setOpenVincularDialog] = useState(false);
  const [selectedDiagnostico, setSelectedDiagnostico] = useState<Diagnostico | null>(null);
  const [selectedItens, setSelectedItens] = useState<number[]>([]);

  // Form state
  const [formData, setFormData] = useState<DiagnosticoCreate>({
    nome: '',
    descricao: '',
    ano_letivo: new Date().getFullYear(),
    tipo: TipoDiagnostico.INICIAL,
    bimestre_referencia: undefined,
    objetivo_avaliacao: '',
    genero_textual: '',
    aplicavel_ano_inicial: 1,
    aplicavel_ano_final: 5,
  });

  // Stepper
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Dados do Diagnóstico', 'Vincular Itens'];

  useEffect(() => {
    loadDiagnosticos();
    loadItens();
  }, []);

  const loadDiagnosticos = async () => {
    try {
      setLoading(true);
      const response = await diagnosticosAPI.list({ ativo: true });
      setDiagnosticos(response.data);
    } catch (err: any) {
      setError('Erro ao carregar diagnósticos');
    } finally {
      setLoading(false);
    }
  };

  const loadItens = async () => {
    try {
      const response = await diagnosticosAPI.listItens({ ativo: true });
      setItensDisponiveis(response.data);
    } catch (err: any) {
      setError('Erro ao carregar itens');
    }
  };

  const handleOpenCreateDialog = () => {
    setFormData({
      nome: '',
      descricao: '',
      ano_letivo: new Date().getFullYear(),
      tipo: TipoDiagnostico.INICIAL,
      bimestre_referencia: undefined,
      objetivo_avaliacao: '',
      genero_textual: '',
      aplicavel_ano_inicial: 1,
      aplicavel_ano_final: 5,
    });
    setActiveStep(0);
    setSelectedItens([]);
    setOpenCreateDialog(true);
    setError('');
    setSuccess('');
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setActiveStep(0);
    setSelectedItens([]);
  };

  const handleFormChange = (field: keyof DiagnosticoCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemToggle = (itemId: number) => {
    setSelectedItens((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItens(itensDisponiveis.map((item) => item.id));
  };

  const handleSelectLeitura = () => {
    const leituraIds = itensDisponiveis
      .filter((item) => item.modalidade === ModalidadeDiagnostico.LEITURA)
      .map((item) => item.id);
    setSelectedItens(leituraIds);
  };

  const handleSelectEscrita = () => {
    const escritaIds = itensDisponiveis
      .filter((item) => item.modalidade === ModalidadeDiagnostico.ESCRITA)
      .map((item) => item.id);
    setSelectedItens(escritaIds);
  };

  const handleDeselectAll = () => {
    setSelectedItens([]);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validar formulário
      if (!formData.nome || !formData.objetivo_avaliacao || !formData.genero_textual) {
        setError('Preencha todos os campos obrigatórios');
        return;
      }
      setError('');
      setActiveStep(1);
    } else {
      // Criar diagnóstico
      handleCreateDiagnostico();
    }
  };

  const handleBack = () => {
    setActiveStep(0);
  };

  const handleCreateDiagnostico = async () => {
    if (selectedItens.length === 0) {
      setError('Selecione pelo menos um item para vincular ao diagnóstico');
      return;
    }

    try {
      setLoading(true);

      // 1. Criar diagnóstico
      const createResponse = await diagnosticosAPI.create(formData);
      const novoDiagnosticoId = createResponse.data.id;

      // 2. Vincular itens
      await diagnosticosAPI.vincularItens(novoDiagnosticoId, selectedItens);

      setSuccess(`Diagnóstico "${formData.nome}" criado com sucesso e ${selectedItens.length} itens vinculados!`);
      handleCloseCreateDialog();
      loadDiagnosticos();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVincularDialog = (diagnostico: Diagnostico) => {
    setSelectedDiagnostico(diagnostico);
    setSelectedItens(diagnostico.itens?.map((i) => i.id) || []);
    setOpenVincularDialog(true);
    setError('');
  };

  const handleVincularItens = async () => {
    if (!selectedDiagnostico) return;

    if (selectedItens.length === 0) {
      setError('Selecione pelo menos um item');
      return;
    }

    try {
      setLoading(true);
      await diagnosticosAPI.vincularItens(selectedDiagnostico.id, selectedItens);
      setSuccess(`Itens vinculados com sucesso ao diagnóstico "${selectedDiagnostico.nome}"`);
      setOpenVincularDialog(false);
      loadDiagnosticos();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao vincular itens');
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: TipoDiagnostico) => {
    return tipo === TipoDiagnostico.INICIAL ? 'Inicial' : 'Final de Bimestre';
  };

  const getBimestreLabel = (bim?: Bimestre) => {
    if (!bim) return '-';
    const labels = {
      [Bimestre.PRIMEIRO]: '1º Bimestre',
      [Bimestre.SEGUNDO]: '2º Bimestre',
      [Bimestre.TERCEIRO]: '3º Bimestre',
      [Bimestre.QUARTO]: '4º Bimestre',
    };
    return labels[bim];
  };

  const getModalidadeLabel = (mod: ModalidadeDiagnostico) => {
    return mod === ModalidadeDiagnostico.LEITURA ? 'Leitura' : 'Escrita';
  };

  const getModalidadeColor = (mod: ModalidadeDiagnostico): 'primary' | 'secondary' => {
    return mod === ModalidadeDiagnostico.LEITURA ? 'primary' : 'secondary';
  };

  const getStatusAgendamento = (diag: Diagnostico) => {
    if (!diag.data_disponivel && !diag.data_limite) {
      return { label: 'Sempre Disponível', color: 'default' as const };
    }

    const now = new Date();
    const dataDisponivel = diag.data_disponivel ? new Date(diag.data_disponivel) : null;
    const dataLimite = diag.data_limite ? new Date(diag.data_limite) : null;

    // Se tem data limite e já passou
    if (dataLimite && now > dataLimite) {
      return { label: 'Expirado', color: 'error' as const };
    }

    // Se tem data disponível e ainda não chegou
    if (dataDisponivel && now < dataDisponivel) {
      return { label: 'Agendado', color: 'info' as const };
    }

    // Se está dentro do período (ou sem data limite definida)
    if (dataDisponivel && now >= dataDisponivel) {
      if (!dataLimite || now <= dataLimite) {
        return { label: 'Disponível', color: 'success' as const };
      }
    }

    return { label: 'Disponível', color: 'success' as const };
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <AppBarWithUserMenu title="Gestão de Diagnósticos" showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Diagnósticos</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreateDialog}>
            Novo Diagnóstico
          </Button>
        </Box>

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

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Ano Letivo</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Bimestre</TableCell>
                <TableCell>Anos Aplicáveis</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Disponível</TableCell>
                <TableCell>Limite</TableCell>
                <TableCell>Itens</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diagnosticos.map((diag) => (
                <TableRow key={diag.id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {diag.nome}
                    </Typography>
                    {diag.descricao && (
                      <Typography variant="caption" color="text.secondary">
                        {diag.descricao}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{diag.ano_letivo}</TableCell>
                  <TableCell>
                    <Chip label={getTipoLabel(diag.tipo)} size="small" />
                  </TableCell>
                  <TableCell>{getBimestreLabel(diag.bimestre_referencia)}</TableCell>
                  <TableCell>
                    {diag.aplicavel_ano_inicial}º ao {diag.aplicavel_ano_final}º ano
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusAgendamento(diag).label}
                      color={getStatusAgendamento(diag).color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {formatDateTime(diag.data_disponivel)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {formatDateTime(diag.data_limite)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${diag.itens?.length || 0} itens`}
                      color={diag.itens && diag.itens.length > 0 ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenVincularDialog(diag)}>
                      <LinkIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {diagnosticos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography color="text.secondary">
                      Nenhum diagnóstico cadastrado. Clique em "Novo Diagnóstico" para começar.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Dialog: Criar Diagnóstico com Stepper */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Novo Diagnóstico</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome do Diagnóstico *"
                    value={formData.nome}
                    onChange={(e) => handleFormChange('nome', e.target.value)}
                    placeholder="Ex: Diagnóstico Inicial 2025"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descrição"
                    multiline
                    rows={2}
                    value={formData.descricao}
                    onChange={(e) => handleFormChange('descricao', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Ano Letivo *"
                    value={formData.ano_letivo}
                    onChange={(e) => handleFormChange('ano_letivo', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo *</InputLabel>
                    <Select
                      value={formData.tipo}
                      onChange={(e) => handleFormChange('tipo', e.target.value)}
                      label="Tipo *"
                    >
                      <MenuItem value={TipoDiagnostico.INICIAL}>Inicial</MenuItem>
                      <MenuItem value={TipoDiagnostico.FINAL_BIMESTRE}>Final de Bimestre</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth disabled={formData.tipo === TipoDiagnostico.INICIAL}>
                    <InputLabel>Bimestre</InputLabel>
                    <Select
                      value={formData.bimestre_referencia || ''}
                      onChange={(e) => handleFormChange('bimestre_referencia', e.target.value)}
                      label="Bimestre"
                    >
                      <MenuItem value={Bimestre.PRIMEIRO}>1º Bimestre</MenuItem>
                      <MenuItem value={Bimestre.SEGUNDO}>2º Bimestre</MenuItem>
                      <MenuItem value={Bimestre.TERCEIRO}>3º Bimestre</MenuItem>
                      <MenuItem value={Bimestre.QUARTO}>4º Bimestre</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Objetivo da Avaliação *"
                    multiline
                    rows={2}
                    value={formData.objetivo_avaliacao}
                    onChange={(e) => handleFormChange('objetivo_avaliacao', e.target.value)}
                    placeholder="O que será avaliado neste diagnóstico"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Gênero Textual *"
                    value={formData.genero_textual}
                    onChange={(e) => handleFormChange('genero_textual', e.target.value)}
                    placeholder="Ex: Lista, Parlenda, Cantiga"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Data Disponível"
                    type="datetime-local"
                    value={formData.data_disponivel || ''}
                    onChange={(e) => handleFormChange('data_disponivel', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText="Data em que o diagnóstico estará disponível para professores"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Data Limite"
                    type="datetime-local"
                    value={formData.data_limite || ''}
                    onChange={(e) => handleFormChange('data_limite', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText="Data limite para aplicação do diagnóstico"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Ano Inicial</InputLabel>
                    <Select
                      value={formData.aplicavel_ano_inicial}
                      onChange={(e) => handleFormChange('aplicavel_ano_inicial', e.target.value)}
                      label="Ano Inicial"
                    >
                      {[1, 2, 3, 4, 5].map((ano) => (
                        <MenuItem key={ano} value={ano}>
                          {ano}º ano
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Ano Final</InputLabel>
                    <Select
                      value={formData.aplicavel_ano_final}
                      onChange={(e) => handleFormChange('aplicavel_ano_final', e.target.value)}
                      label="Ano Final"
                    >
                      {[1, 2, 3, 4, 5].map((ano) => (
                        <MenuItem key={ano} value={ano}>
                          {ano}º ano
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Selecione os itens para este diagnóstico
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSelectAll}
                >
                  Selecionar Todos
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={handleSelectLeitura}
                >
                  Apenas Leitura
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={handleSelectEscrita}
                >
                  Apenas Escrita
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleDeselectAll}
                >
                  Desmarcar Todos
                </Button>
              </Box>

              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {itensDisponiveis.map((item) => (
                  <React.Fragment key={item.id}>
                    <ListItem
                      button
                      onClick={() => handleItemToggle(item.id)}
                      sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemIcon>
                        <Checkbox checked={selectedItens.includes(item.id)} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={getModalidadeLabel(item.modalidade)}
                              color={getModalidadeColor(item.modalidade)}
                              size="small"
                            />
                            <Typography>{item.descricao}</Typography>
                          </Box>
                        }
                        secondary={`Anos: ${item.anos_aplicaveis.split(',').join(', ')}`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {selectedItens.length} item(ns) selecionado(s)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancelar</Button>
          {activeStep > 0 && <Button onClick={handleBack}>Voltar</Button>}
          <Button onClick={handleNext} variant="contained" disabled={loading}>
            {activeStep === steps.length - 1 ? 'Criar Diagnóstico' : 'Próximo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Vincular Itens a Diagnóstico Existente */}
      <Dialog open={openVincularDialog} onClose={() => setOpenVincularDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Vincular Itens - {selectedDiagnostico?.nome}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleSelectAll}
            >
              Selecionar Todos
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={handleSelectLeitura}
            >
              Apenas Leitura
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={handleSelectEscrita}
            >
              Apenas Escrita
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleDeselectAll}
            >
              Desmarcar Todos
            </Button>
          </Box>

          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {itensDisponiveis.map((item) => (
              <React.Fragment key={item.id}>
                <ListItem
                  button
                  onClick={() => handleItemToggle(item.id)}
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <ListItemIcon>
                    <Checkbox checked={selectedItens.includes(item.id)} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getModalidadeLabel(item.modalidade)}
                          color={getModalidadeColor(item.modalidade)}
                          size="small"
                        />
                        <Typography>{item.descricao}</Typography>
                      </Box>
                    }
                    secondary={`Anos: ${item.anos_aplicaveis.split(',').join(', ')}`}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {selectedItens.length} item(ns) selecionado(s)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVincularDialog(false)}>Cancelar</Button>
          <Button onClick={handleVincularItens} variant="contained" disabled={loading}>
            Vincular Itens
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiagnosticosPage;
