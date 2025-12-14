import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, FormControl, Grid, InputLabel,
  MenuItem, Select, Typography, Alert, CircularProgress,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { diagnosticosAPI } from '../services/api';
import { Diagnostico, RelatorioDiagnosticoPorEixo, HipoteseEscrita } from '../types';

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'];

const getHipoteseLabel = (hip: HipoteseEscrita) => {
  const labels = {
    [HipoteseEscrita.NAO_AVALIADO]: 'Não Avaliado',
    [HipoteseEscrita.PRE_SILABICO]: 'Pré-Silábico',
    [HipoteseEscrita.SILABICO_SEM_VALOR_SONORO]: 'Silábico S/ Valor',
    [HipoteseEscrita.SILABICO_COM_VALOR_SONORO]: 'Silábico C/ Valor',
    [HipoteseEscrita.SILABICO_ALFABETICO]: 'Silábico Alfabético',
    [HipoteseEscrita.ALFABETICO]: 'Alfabético',
  };
  return labels[hip];
};

interface RelatorioDiagnosticoProps {
  turmaId?: number | '';
  escolaId?: number | '';
  anoLetivo?: number;
}

const RelatorioDiagnostico: React.FC<RelatorioDiagnosticoProps> = ({
  turmaId,
  escolaId,
  anoLetivo,
}) => {
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [selectedDiagnostico, setSelectedDiagnostico] = useState<number | ''>('');
  const [relatorio, setRelatorio] = useState<RelatorioDiagnosticoPorEixo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDiagnosticos();
  }, []);

  const loadDiagnosticos = async () => {
    try {
      const response = await diagnosticosAPI.list({ ativo: true });
      setDiagnosticos(response.data);
    } catch (err) {
      setError('Erro ao carregar diagnósticos');
    }
  };

  const loadRelatorio = async (diagnosticoId: number) => {
    try {
      setLoading(true);
      const params: any = {};
      if (turmaId) params.turma_id = turmaId;
      if (escolaId) params.escola_id = escolaId;
      const response = await diagnosticosAPI.relatorioPorEixo(diagnosticoId, params);
      setRelatorio(response.data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar relatório');
      setRelatorio(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnosticoChange = (diagnosticoId: number) => {
    setSelectedDiagnostico(diagnosticoId);
    loadRelatorio(diagnosticoId);
  };

  // Recarregar relatório quando os filtros mudarem
  useEffect(() => {
    if (selectedDiagnostico) {
      loadRelatorio(selectedDiagnostico as number);
    }
  }, [turmaId, escolaId]);

  const chartData = relatorio?.estatisticas_por_eixo.map((est, index) => ({
    name: getHipoteseLabel(est.eixo),
    quantidade: est.quantidade,
    percentual: est.percentual,
    fill: COLORS[index % COLORS.length],
  })) || [];

  return (
    <Box>
      {/* Indicador de filtros ativos */}
      {(turmaId || escolaId) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Filtros aplicados: {turmaId ? 'Turma selecionada' : ''}{turmaId && escolaId ? ' • ' : ''}{escolaId && !turmaId ? 'Escola selecionada' : ''}
          {' - Os dados abaixo refletem apenas a seleção feita nos filtros acima.'}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Selecione o Diagnóstico</InputLabel>
        <Select
          value={selectedDiagnostico}
          onChange={(e) => handleDiagnosticoChange(e.target.value as number)}
          label="Selecione o Diagnóstico"
        >
          {diagnosticos.map(d => (
            <MenuItem key={d.id} value={d.id}>{d.nome} - {d.ano_letivo}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

      {relatorio && (
        <Grid container spacing={3}>
          {/* Cards de Resumo */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">{relatorio.total_alunos_turma}</Typography>
                <Typography variant="body2" color="text.secondary">Total de Alunos</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">{relatorio.total_alunos_avaliados}</Typography>
                <Typography variant="body2" color="text.secondary">Avaliados ({relatorio.percentual_avaliados}%)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error">{relatorio.total_nao_avaliados}</Typography>
                <Typography variant="body2" color="text.secondary">Não Avaliados ({relatorio.percentual_nao_avaliados}%)</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfico de Barras - Quantidade por Eixo */}
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Alunos por Hipótese de Escrita (Eixo)</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantidade" name="Quantidade">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfico de Pizza - Distribuição Percentual */}
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Distribuição Percentual</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="percentual"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      label={(entry) => `${entry.percentual}%`}
                      labelLine
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Tabela Detalhada */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Detalhamento por Eixo</Typography>
                <Grid container spacing={2}>
                  {relatorio.estatisticas_por_eixo.map((est, index) => (
                    <Grid item xs={12} key={est.eixo}>
                      <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ width: 20, height: 20, bgcolor: COLORS[index % COLORS.length], borderRadius: '50%', mr: 2 }} />
                        <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{getHipoteseLabel(est.eixo)}</Typography>
                        <Typography sx={{ mr: 4 }}><strong>{est.quantidade}</strong> alunos</Typography>
                        <Typography color="text.secondary"><strong>{est.percentual}%</strong></Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default RelatorioDiagnostico;
