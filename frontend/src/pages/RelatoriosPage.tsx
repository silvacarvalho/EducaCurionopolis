/**
 * Relatórios Page with Drill-Down Functionality
 * Demonstrates the drill-down chart component with real data
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DrillDownChart from '../components/DrillDownChart';
import { relatoriosAPI } from '../services/api';
import { DrillDownData, Bimestre } from '../types';

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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const RelatoriosPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Filters
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear());
  const [bimestre, setBimestre] = useState<Bimestre | ''>('');

  // Drill-down state for evaluations
  const [evalLevel, setEvalLevel] = useState<'geral' | 'escolas' | 'turmas'>('geral');
  const [selectedEscolaId, setSelectedEscolaId] = useState<number | null>(null);
  const [evalData, setEvalData] = useState<DrillDownData[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState('');

  // Summary data
  const [summaryData, setSummaryData] = useState<any>(null);

  // Breadcrumbs for navigation
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick?: () => void }[]
  >([{ label: 'Visão Geral' }]);

  // Fetch evaluation data based on current level
  const fetchEvalData = async () => {
    setEvalLoading(true);
    setEvalError('');

    try {
      if (evalLevel === 'geral') {
        // Fetch summary
        const response = await relatoriosAPI.avaliacaoGeral({
          ano_letivo: anoLetivo,
          bimestre: bimestre || undefined,
        });
        setSummaryData(response.data);

        // Prepare data for chart
        const data: DrillDownData[] = [
          {
            label: 'Abaixo da Média',
            value: response.data.abaixo_media,
            percentage: response.data.percentual_abaixo,
          },
          {
            label: 'Na Média',
            value: response.data.na_media,
            percentage: response.data.percentual_na,
          },
          {
            label: 'Acima da Média',
            value: response.data.acima_media,
            percentage: response.data.percentual_acima,
          },
        ];
        setEvalData(data);
        setBreadcrumbs([
          { label: 'Visão Geral', onClick: () => resetToGeral() },
        ]);
      } else if (evalLevel === 'escolas') {
        // Fetch drill-down by schools
        const response = await relatoriosAPI.avaliacaoDrillDownEscolas({
          ano_letivo: anoLetivo,
          bimestre: bimestre || undefined,
        });
        setEvalData(response.data);
        setBreadcrumbs([
          { label: 'Visão Geral', onClick: () => resetToGeral() },
          { label: 'Por Escola' },
        ]);
      } else if (evalLevel === 'turmas' && selectedEscolaId) {
        // Fetch drill-down by classes
        const response = await relatoriosAPI.avaliacaoDrillDownTurmas(
          selectedEscolaId,
          {
            ano_letivo: anoLetivo,
            bimestre: bimestre || undefined,
          }
        );
        setEvalData(response.data);
        setBreadcrumbs([
          { label: 'Visão Geral', onClick: () => resetToGeral() },
          { label: 'Por Escola', onClick: () => drillToEscolas() },
          { label: 'Por Turma' },
        ]);
      }
    } catch (error: any) {
      setEvalError(
        error.response?.data?.detail || 'Erro ao carregar dados'
      );
    } finally {
      setEvalLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchEvalData();
    }
  }, [evalLevel, selectedEscolaId, anoLetivo, bimestre, tabValue]);

  const resetToGeral = () => {
    setEvalLevel('geral');
    setSelectedEscolaId(null);
  };

  const drillToEscolas = () => {
    setEvalLevel('escolas');
    setSelectedEscolaId(null);
  };

  const handleDrillDown = (item: DrillDownData) => {
    if (evalLevel === 'geral') {
      // Drill down to schools
      setEvalLevel('escolas');
    } else if (evalLevel === 'escolas' && item.escola_id) {
      // Drill down to classes
      setSelectedEscolaId(item.escola_id);
      setEvalLevel('turmas');
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Relatórios - EDUCA+ Curionópolis
          </Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Voltar
          </Button>
          <Button color="inherit" onClick={logout}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Relatórios e Métricas
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Ano Letivo</InputLabel>
                <Select
                  value={anoLetivo}
                  label="Ano Letivo"
                  onChange={(e) => setAnoLetivo(e.target.value as number)}
                >
                  <MenuItem value={2023}>2023</MenuItem>
                  <MenuItem value={2024}>2024</MenuItem>
                  <MenuItem value={2025}>2025</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Bimestre</InputLabel>
                <Select
                  value={bimestre}
                  label="Bimestre"
                  onChange={(e) => setBimestre(e.target.value as Bimestre | '')}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value={1}>1º Bimestre</MenuItem>
                  <MenuItem value={2}>2º Bimestre</MenuItem>
                  <MenuItem value={3}>3º Bimestre</MenuItem>
                  <MenuItem value={4}>4º Bimestre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs for different report types */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Avaliações" />
            <Tab label="Diagnósticos" />
            <Tab label="SAEB" />
          </Tabs>
        </Box>

        {/* Avaliações Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Summary Cards */}
          {summaryData && evalLevel === 'geral' && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
                  <Typography variant="h6">Total de Alunos</Typography>
                  <Typography variant="h4">{summaryData.total_alunos}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'white' }}>
                  <Typography variant="h6">Abaixo da Média</Typography>
                  <Typography variant="h4">{summaryData.abaixo_media}</Typography>
                  <Typography variant="body2">
                    {summaryData.percentual_abaixo.toFixed(2)}%
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'white' }}>
                  <Typography variant="h6">Na Média</Typography>
                  <Typography variant="h4">{summaryData.na_media}</Typography>
                  <Typography variant="body2">
                    {summaryData.percentual_na.toFixed(2)}%
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'white' }}>
                  <Typography variant="h6">Acima da Média</Typography>
                  <Typography variant="h4">{summaryData.acima_media}</Typography>
                  <Typography variant="body2">
                    {summaryData.percentual_acima.toFixed(2)}%
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Drill-Down Chart */}
          <DrillDownChart
            title={
              evalLevel === 'geral'
                ? 'Distribuição de Desempenho'
                : evalLevel === 'escolas'
                ? 'Desempenho por Escola'
                : 'Desempenho por Turma'
            }
            data={evalData}
            loading={evalLoading}
            error={evalError}
            onDrillDown={evalLevel !== 'turmas' ? handleDrillDown : undefined}
            breadcrumbs={breadcrumbs}
            colors={
              evalLevel === 'geral'
                ? ['#f44336', '#ff9800', '#4caf50']
                : undefined
            }
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Clique nas barras para explorar os dados em mais detalhes
            </Typography>
          </Box>
        </TabPanel>

        {/* Diagnósticos Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="body1">
            Relatórios de Diagnósticos (a implementar)
          </Typography>
        </TabPanel>

        {/* SAEB Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1">
            Relatórios SAEB (a implementar)
          </Typography>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default RelatoriosPage;
