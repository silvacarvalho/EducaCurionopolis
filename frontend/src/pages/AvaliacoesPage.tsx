import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Snackbar,
  Chip,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { avaliacoesAgregadasAPI, turmasAPI, disciplinasAPI, alunosAPI } from '../services/api';
import MainLayout from '../components/layout/MainLayout';

interface Turma {
  id: number;
  nome: string;
  ano_escolar: number;
  ano_letivo: number;
  total_alunos?: number;
}

interface Disciplina {
  id: number;
  nome: string;
  carga_horaria?: number;
  turmas_ids?: number[];
}

interface Aluno {
  id: number;
  nome_completo: string;
}

const AvaliacoesPage: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [allDisciplinas, setAllDisciplinas] = useState<Disciplina[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Filters - Ano atual fixo
  const anoLetivo = new Date().getFullYear();
  const [selectedTurma, setSelectedTurma] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedBimestre, setSelectedBimestre] = useState<number>(1);

  // Quantidades
  const [qtdAbaixoMedia, setQtdAbaixoMedia] = useState(0);
  const [qtdNaMedia, setQtdNaMedia] = useState(0);
  const [qtdAcimaMedia, setQtdAcimaMedia] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Estado da avaliação existente
  const [avaliacaoExistente, setAvaliacaoExistente] = useState<any>(null);

  useEffect(() => {
    loadTurmas();
  }, []);

  useEffect(() => {
    // load all disciplines once (to build unique discipline list)
    loadAllDisciplinas();
  }, []);

  useEffect(() => {
    // When turma changes, update disciplines list shown
    const turma = turmas.find(t => t.id === parseInt(selectedTurma));
    setTotalAlunos(turma?.total_alunos || 0);

    if (selectedTurma) {
      // Load disciplinas vinculadas à turma específica
      loadDisciplinasByTurma(parseInt(selectedTurma));
    } else {
      // No turma selected: show unique disciplines across scope (allDisciplinas)
      const unique: Disciplina[] = [];
      const seen = new Set<string>();
      for (const d of allDisciplinas) {
        const key = (d.nome || '').toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(d);
        }
      }
      setDisciplinas(unique);
      resetForm();
    }
  }, [selectedTurma, turmas, allDisciplinas]);

  useEffect(() => {
    // Load existing aggregated evaluation when a disciplina and bimestre are selected.
    // If a turma is selected too, the backend will filter by turma; otherwise returns aggregated across scope.
    if (selectedDisciplina && selectedBimestre) {
      loadAvaliacaoExistente();
    } else {
      resetForm();
    }
  }, [selectedTurma, selectedDisciplina, selectedBimestre]);

  const resetForm = () => {
    setQtdAbaixoMedia(0);
    setQtdNaMedia(0);
    setQtdAcimaMedia(0);
    setObservacoes('');
    setAvaliacaoExistente(null);
  };

  const loadTurmas = async () => {
    try {
      const response = await turmasAPI.list();
      setTurmas(response.data);
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
    }
  };

  const loadAllDisciplinas = async () => {
    try {
      const response = await disciplinasAPI.list();
      setAllDisciplinas(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar disciplinas:', err);
    }
  };

  const loadDisciplinasByTurma = async (turmaId: number) => {
    try {
      const response = await disciplinasAPI.listByTurma(turmaId);
      setDisciplinas(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar disciplinas da turma:', err);
      setDisciplinas([]);
    }
  };

  // Removed loadTotalAlunos - now using total_alunos from turma object

  const loadAvaliacaoExistente = async () => {
    try {
      setLoading(true);
      const params: any = {
        bimestre: selectedBimestre,
        ano_letivo: anoLetivo,
      };
      if (selectedTurma) params.turma_id = selectedTurma;
      if (selectedDisciplina) params.disciplina_nome = selectedDisciplina;

      const response = await avaliacoesAgregadasAPI.list(params);

      if (response.data && response.data.length > 0) {
        const avaliacao = response.data[0];
        setAvaliacaoExistente(avaliacao);
        setQtdAbaixoMedia(avaliacao.qtd_abaixo_media || 0);
        setQtdNaMedia(avaliacao.qtd_na_media || 0);
        setQtdAcimaMedia(avaliacao.qtd_acima_media || 0);
        setObservacoes(avaliacao.observacoes || '');
      } else {
        resetForm();
      }
    } catch (err: any) {
      console.error('Erro ao carregar avaliação existente:', err);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarAvaliacao = async () => {
    // Validação: total deve ser igual ao número de alunos
    const totalInformado = qtdAbaixoMedia + qtdNaMedia + qtdAcimaMedia;
    if (totalInformado !== totalAlunos) {
      setError(
        `O total informado (${totalInformado}) deve ser igual ao número de alunos da turma (${totalAlunos})`
      );
      return;
    }

    try {
      setLoading(true);

      const avaliacaoData = {
        turma_id: parseInt(selectedTurma),
        // disciplina_id from the disciplinas list (já filtrada pela turma)
        disciplina_id: (() => {
          const found = disciplinas.find(d => (d.nome || '').toLowerCase().trim() === (selectedDisciplina || '').toLowerCase().trim());
          return found ? found.id : undefined;
        })(),
        bimestre: selectedBimestre,
        ano_letivo: anoLetivo,
        qtd_abaixo_media: qtdAbaixoMedia,
        qtd_na_media: qtdNaMedia,
        qtd_acima_media: qtdAcimaMedia,
        observacoes: observacoes || undefined,
      };

      if (!avaliacaoData.disciplina_id) {
        setError('Disciplina não encontrada para a turma selecionada. Selecione uma disciplina válida.');
        return;
      }

      if (avaliacaoExistente) {
        // Atualizar avaliação existente
        await avaliacoesAgregadasAPI.update(avaliacaoExistente.id, avaliacaoData);
        setSuccess('Avaliação atualizada com sucesso!');
      } else {
        // Criar nova avaliação
        await avaliacoesAgregadasAPI.create(avaliacaoData);
        setSuccess('Avaliação criada com sucesso!');
      }

      // Recarrega avaliação
      await loadAvaliacaoExistente();
    } catch (err: any) {
      console.error('Erro ao salvar avaliação:', err);
      setError(err.response?.data?.detail || err.message || 'Erro ao salvar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const getBimestreLabel = (bimestre: number) => {
    const labels = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    return labels[bimestre - 1] || `${bimestre}º Bimestre`;
  };

  const getTurmaLabel = () => {
    const turma = turmas.find((t) => t.id.toString() === selectedTurma);
    return turma ? `${turma.nome} - ${turma.ano_letivo}` : 'Nenhuma';
  };

  const getDisciplinaLabel = () => {
    return selectedDisciplina || 'Nenhuma';
  };

  const getTotalInformado = () => qtdAbaixoMedia + qtdNaMedia + qtdAcimaMedia;

  const isTotalValid = () => getTotalInformado() === totalAlunos;

  const canSave = () => {
    return selectedTurma && selectedDisciplina && selectedBimestre && totalAlunos > 0 && isTotalValid();
  };

  return (
    <MainLayout title="Gestão de Avaliações Bimestrais">
      <Box sx={{ width: '100%', height: '100%' }}>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AssessmentIcon color="primary" />
                  <Typography variant="h6">Total de Alunos</Typography>
                </Box>
                <Typography variant="h3">{totalAlunos}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {avaliacaoExistente ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <RemoveIcon color="disabled" />
                  )}
                  <Typography variant="h6">Status</Typography>
                </Box>
                <Chip
                  label={avaliacaoExistente ? 'Avaliação Registrada' : 'Não Avaliado'}
                  color={avaliacaoExistente ? 'success' : 'default'}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Ano Letivo
                </Typography>
                <Typography variant="h4">{anoLetivo}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Bimestre
                </Typography>
                <Typography variant="h4">
                  {selectedBimestre ? getBimestreLabel(selectedBimestre) : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selecione Turma, Disciplina e Bimestre
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            O ano letivo é automaticamente definido como ano corrente (<strong>{anoLetivo}</strong>).
            Informe a quantidade de alunos em cada nível de desempenho.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={selectedTurma}
                  label="Turma"
                  onChange={(e) => {
                    setSelectedTurma(e.target.value);
                    setSelectedDisciplina('');
                  }}
                >
                  {turmas.map((turma) => (
                    <MenuItem key={turma.id} value={turma.id.toString()}>
                      {turma.nome} - {turma.ano_letivo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Disciplina</InputLabel>
                <Select
                  value={selectedDisciplina}
                  label="Disciplina"
                  onChange={(e) => setSelectedDisciplina(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {disciplinas.map((disciplina) => (
                    <MenuItem key={disciplina.id} value={disciplina.nome}>
                      {disciplina.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth required disabled={!selectedDisciplina}>
                <InputLabel>Bimestre</InputLabel>
                <Select
                  value={selectedBimestre}
                  label="Bimestre"
                  onChange={(e) => setSelectedBimestre(Number(e.target.value))}
                >
                  <MenuItem value={1}>1º Bimestre</MenuItem>
                  <MenuItem value={2}>2º Bimestre</MenuItem>
                  <MenuItem value={3}>3º Bimestre</MenuItem>
                  <MenuItem value={4}>4º Bimestre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Evaluation Form */}
        {selectedTurma && selectedDisciplina && selectedBimestre && totalAlunos > 0 ? (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6">Avaliação da Turma</Typography>
              <Typography variant="body2" color="text.secondary">
                {getTurmaLabel()} - {getDisciplinaLabel()} - {getBimestreLabel(selectedBimestre)}
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TrendingDownIcon />
                      <Typography variant="h6">Abaixo da Média</Typography>
                    </Box>
                    <TextField
                      type="number"
                      fullWidth
                      value={qtdAbaixoMedia}
                      onChange={(e) => setQtdAbaixoMedia(Math.max(0, parseInt(e.target.value) || 0))}
                      inputProps={{ min: 0, max: totalAlunos }}
                      sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                      Alunos com desempenho abaixo da média
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <RemoveIcon />
                      <Typography variant="h6">Na Média</Typography>
                    </Box>
                    <TextField
                      type="number"
                      fullWidth
                      value={qtdNaMedia}
                      onChange={(e) => setQtdNaMedia(Math.max(0, parseInt(e.target.value) || 0))}
                      inputProps={{ min: 0, max: totalAlunos }}
                      sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                      Alunos com desempenho na média
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TrendingUpIcon />
                      <Typography variant="h6">Acima da Média</Typography>
                    </Box>
                    <TextField
                      type="number"
                      fullWidth
                      value={qtdAcimaMedia}
                      onChange={(e) => setQtdAcimaMedia(Math.max(0, parseInt(e.target.value) || 0))}
                      inputProps={{ min: 0, max: totalAlunos }}
                      sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                      Alunos com desempenho acima da média
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Alert severity={isTotalValid() ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Total informado:</strong> {getTotalInformado()} de {totalAlunos} alunos
                  </Typography>
                  {!isTotalValid() && (
                    <Typography variant="body2" color="error">
                      ⚠️ O total deve ser exatamente {totalAlunos} alunos
                    </Typography>
                  )}
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações (opcional)"
                  multiline
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre a avaliação da turma..."
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Limpar
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSalvarAvaliacao}
                    disabled={loading || !canSave()}
                  >
                    {avaliacaoExistente ? 'Atualizar Avaliação' : 'Salvar Avaliação'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        ) : (
          <Alert severity="info">
            Selecione uma turma, disciplina e bimestre para registrar a avaliação
          </Alert>
        )}

        {/* Success Snackbar */}
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
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
    </MainLayout>
  );
};

export default AvaliacoesPage;
