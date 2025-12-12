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
  IconButton,
  Menu,
  Card,
  CardContent,
  Chip,
  alpha,
  Fade,
  Grow,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  ArrowBack as ArrowBackIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Print as PrintIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  TrendingFlat as TrendingFlatIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  Assessment as AssessmentIcon,
  FilterList as FilterListIcon,
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  EmojiEvents as TrophyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Groups as GroupsIcon,
  AutoGraph as AutoGraphIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DrillDownChart from '../components/DrillDownChart';
import DetalhamentoAvaliacaoModal from '../components/DetalhamentoAvaliacaoModal';
import RelatorioDiagnosticoPorEixo from '../components/RelatorioDiagnosticoPorEixo';
import { relatoriosAPI } from '../services/api';
import { DrillDownData, Bimestre } from '../types';
import MainLayout from '../components/layout/MainLayout';
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

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Filters
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear());
  const [bimestre, setBimestre] = useState<Bimestre | ''>('');
  const [disciplinaId, setDisciplinaId] = useState<number | ''>('');
  const [escolaId, setEscolaId] = useState<number | ''>('');
  const [turmaId, setTurmaId] = useState<number | ''>('');
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);

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

  // Modal state
  const [detalhamentoModalOpen, setDetalhamentoModalOpen] = useState(false);
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [selectedTurmaNome, setSelectedTurmaNome] = useState<string>('');

  // Print and PDF functions
  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePDF = async () => {
    try {
      // Import html2canvas and jsPDF dynamically
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Get the main content element
      const content = document.querySelector('#relatorios-content') as HTMLElement;
      if (!content) return;

      // Generate canvas from HTML
      const canvas = await html2canvas(content, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with current date and filters
      const date = new Date().toISOString().split('T')[0];
      const filename = `relatorio_${date}_${anoLetivo}_bim${bimestre || 'todos'}.pdf`;

      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  // Fetch evaluation data based on current level
  const fetchEvalData = async () => {
    setEvalLoading(true);
    setEvalError('');

    try {
      if (evalLevel === 'geral') {
        // Fetch summary from aggregated evaluations
        const response = await relatoriosAPI.avaliacaoAgregadaGeral({
          ano_letivo: anoLetivo,
          bimestre: bimestre || undefined,
          disciplina_id: disciplinaId || undefined,
          escola_id: escolaId || undefined,
          turma_id: turmaId || undefined,
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
        // Fetch drill-down by schools from aggregated data
        const response = await relatoriosAPI.avaliacaoAgregadaDrillDownEscolas({
          ano_letivo: anoLetivo,
          bimestre: bimestre || undefined,
          disciplina_id: disciplinaId || undefined,
          escola_id: escolaId || undefined,
          turma_id: turmaId || undefined,
        });
        console.log('Escolas data received:', response.data);
        setEvalData(response.data);
        setBreadcrumbs([
          { label: 'Visão Geral', onClick: () => resetToGeral() },
          { label: 'Por Escola' },
        ]);
      } else if (evalLevel === 'turmas' && selectedEscolaId) {
        // Fetch drill-down by classes from aggregated data
        const response = await relatoriosAPI.avaliacaoAgregadaDrillDownTurmas(
          selectedEscolaId,
          {
            ano_letivo: anoLetivo,
            bimestre: bimestre || undefined,
            disciplina_id: disciplinaId || undefined,
            turma_id: turmaId || undefined,
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
    loadDisciplinas();
    loadEscolas();
  }, []);

  useEffect(() => {
    if (escolaId) {
      loadTurmas(escolaId as number);
    } else {
      setTurmas([]);
      setTurmaId('');
    }
  }, [escolaId]);

  useEffect(() => {
    if (tabValue === 0) {
      fetchEvalData();
    }
  }, [evalLevel, selectedEscolaId, anoLetivo, bimestre, disciplinaId, escolaId, turmaId, tabValue]);

  const loadDisciplinas = async () => {
    try {
      const { disciplinasAPI } = await import('../services/api');
      const response = await disciplinasAPI.list();
      // Deduplicate disciplines by normalized name (case-insensitive, trimmed)
      const seen: Record<string, any> = {};
      const unique: any[] = [];
      (response.data || []).forEach((d: any) => {
        const key = (d.nome || '').toLowerCase().trim();
        if (!seen[key]) {
          seen[key] = true;
          unique.push(d);
        }
      });
      setDisciplinas(unique);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    }
  };

  const loadEscolas = async () => {
    try {
      const { escolasAPI } = await import('../services/api');
      const response = await escolasAPI.list();
      setEscolas(response.data);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
    }
  };

  const loadTurmas = async (escolaIdParam: number) => {
    try {
      const { turmasAPI } = await import('../services/api');
      const response = await turmasAPI.list({ escola_id: escolaIdParam });
      setTurmas(response.data);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      setTurmas([]);
    }
  };

  const resetToGeral = () => {
    setEvalLevel('geral');
    setSelectedEscolaId(null);
  };

  const drillToEscolas = () => {
    setEvalLevel('escolas');
    setSelectedEscolaId(null);
  };

  const handleDrillDown = (item: DrillDownData) => {
    console.log('handleDrillDown called:', { evalLevel, item });

    if (evalLevel === 'geral') {
      // Drill down to schools
      console.log('Drilling down to escolas');
      setEvalLevel('escolas');
    } else if (evalLevel === 'escolas') {
      // Drill down to classes
      console.log('Drilling down to turmas, escola_id:', item.escola_id);
      if (item.escola_id) {
        setSelectedEscolaId(item.escola_id);
        setEvalLevel('turmas');
      } else {
        console.error('escola_id not found in item:', item);
      }
    } else if (evalLevel === 'turmas') {
      // Open detailed modal for this turma
      console.log('Opening detalhamento modal for turma:', item.turma_id);
      if (item.turma_id) {
        setSelectedTurmaId(item.turma_id);
        setSelectedTurmaNome(item.label);
        setDetalhamentoModalOpen(true);
      }
    }
  };

  return (
    <MainLayout title="Relatórios e Métricas">
      <Box sx={{ width: '100%', height: '100%' }}>

        {/* Action Buttons */}
        <Fade in timeout={600}>
          <Box
            className="no-print"
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              mb: 3,
              '@media print': {
                display: 'none'
              }
            }}
          >
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                borderWidth: 2,
                px: 3,
                py: 1,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                  background: alpha('#1976d2', 0.04),
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              Imprimir
            </Button>
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleGeneratePDF}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              Gerar PDF
            </Button>
          </Box>
        </Fade>

        <Box id="relatorios-content">

        {/* Print-only Filters Summary */}
        <Box
          className="print-only"
          sx={{
            display: 'none',
            '@media print': {
              display: 'block',
              mb: 3,
              p: 2,
              border: '1px solid #ddd',
              borderRadius: 1,
              backgroundColor: '#f5f5f5'
            }
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Filtros Aplicados
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Ano Letivo:</strong> {anoLetivo}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Bimestre:</strong> {bimestre ? `${bimestre}º Bimestre` : 'Todos'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Escola:</strong> {escolaId ? escolas.find(e => e.id === escolaId)?.nome : 'Todas'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Turma:</strong> {turmaId ? turmas.find(t => t.id === turmaId)?.nome : 'Todas'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                <strong>Disciplina:</strong> {disciplinaId ? disciplinas.find(d => d.id === disciplinaId)?.nome : 'Todas'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Filters */}
        <Grow in timeout={800}>
          <Paper
            className="no-print"
            elevation={3}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              border: '1px solid',
              borderColor: 'divider',
              '@media print': {
                display: 'none'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <FilterListIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Filtros de Busca
              </Typography>
            </Box>
          <Grid container spacing={2}>
            {/* First Row */}
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
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Escola</InputLabel>
                <Select
                  value={escolaId}
                  label="Escola"
                  onChange={(e) => setEscolaId(e.target.value as number | '')}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {escolas.map((escola) => (
                    <MenuItem key={escola.id} value={escola.id}>
                      {escola.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth disabled={!escolaId}>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={turmaId}
                  label="Turma"
                  onChange={(e) => setTurmaId(e.target.value as number | '')}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {turmas.map((turma) => (
                    <MenuItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Second Row */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Disciplina</InputLabel>
                <Select
                  value={disciplinaId}
                  label="Disciplina"
                  onChange={(e) => setDisciplinaId(e.target.value as number | '')}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {disciplinas.map((disc) => (
                    <MenuItem key={disc.id} value={disc.id}>
                      {disc.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          </Paper>
        </Grow>

        {/* Print-only Tab Title */}
        <Box
          className="print-only"
          sx={{
            display: 'none',
            '@media print': {
              display: 'block',
              mb: 2
            }
          }}
        >
          <Typography variant="h5" gutterBottom>
            {tabValue === 0 ? 'Avaliações' : tabValue === 1 ? 'Diagnósticos' : 'SAEB'}
          </Typography>
        </Box>

        {/* Tabs for different report types */}
        <Fade in timeout={1000}>
          <Paper
            className="no-print"
            elevation={2}
            sx={{
              borderRadius: 3,
              mb: 3,
              overflow: 'hidden',
              '@media print': {
                display: 'none'
              }
            }}
          >
            <Tabs 
              value={tabValue} 
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                '& .MuiTabs-indicator': {
                  height: 4,
                  borderRadius: '4px 4px 0 0',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: 64,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: 'primary.main',
                    background: alpha('#667eea', 0.05),
                  },
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <Tab icon={<BarChartIcon />} iconPosition="start" label="Avaliações" />
              <Tab icon={<AutoGraphIcon />} iconPosition="start" label="Diagnósticos" />
            </Tabs>
          </Paper>
        </Fade>

        {/* Avaliações Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Summary Cards */}
          {summaryData && evalLevel === 'geral' && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={400}>
                  <Card
                    elevation={4}
                    sx={{
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(102, 126, 234, 0.4)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, mb: 0.5 }}>
                            Total de Alunos
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            {summaryData.total_alunos}
                          </Typography>
                        </Box>
                        <GroupsIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                      </Box>
                      <Chip 
                        icon={<PeopleIcon />} 
                        label="Ativos" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 600,
                        }} 
                      />
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={600}>
                  <Card
                    elevation={4}
                    sx={{
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(245, 87, 108, 0.4)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, mb: 0.5 }}>
                            Abaixo da Média
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            {summaryData.abaixo_media}
                          </Typography>
                        </Box>
                        <WarningIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                      </Box>
                      <Chip 
                        icon={<TrendingDownIcon />} 
                        label={`${summaryData.percentual_abaixo.toFixed(1)}%`}
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 600,
                        }} 
                      />
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={800}>
                  <Card
                    elevation={4}
                    sx={{
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                      color: '#5a3a31',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(252, 182, 159, 0.4)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500, mb: 0.5 }}>
                            Na Média
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            {summaryData.na_media}
                          </Typography>
                        </Box>
                        <TrendingFlatIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                      </Box>
                      <Chip 
                        label={`${summaryData.percentual_na.toFixed(1)}%`}
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(90, 58, 49, 0.15)', 
                          color: '#5a3a31',
                          fontWeight: 600,
                        }} 
                      />
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={1000}>
                  <Card
                    elevation={4}
                    sx={{
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                      color: '#1e4d2b',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(168, 237, 234, 0.4)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500, mb: 0.5 }}>
                            Acima da Média
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            {summaryData.acima_media}
                          </Typography>
                        </Box>
                        <TrophyIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                      </Box>
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label={`${summaryData.percentual_acima.toFixed(1)}%`}
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(30, 77, 43, 0.15)', 
                          color: '#1e4d2b',
                          fontWeight: 600,
                        }} 
                      />
                    </CardContent>
                  </Card>
                </Grow>
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
            onDrillDown={handleDrillDown}
            breadcrumbs={breadcrumbs}
            colors={
              evalLevel === 'geral'
                ? ['#f44336', '#ff9800', '#4caf50']
                : undefined
            }
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {evalLevel === 'turmas'
                ? 'Clique nas barras para ver detalhes dos alunos avaliados'
                : 'Clique nas barras para explorar os dados em mais detalhes'
              }
            </Typography>
          </Box>
        </TabPanel>

        {/* Diagnósticos Tab */}
        <TabPanel value={tabValue} index={1}>
          <RelatorioDiagnosticoPorEixo />
        </TabPanel>

        {/* Modal de Detalhamento */}
        <DetalhamentoAvaliacaoModal
          open={detalhamentoModalOpen}
          onClose={() => setDetalhamentoModalOpen(false)}
          turmaId={selectedTurmaId}
          turmaNome={selectedTurmaNome}
          anoLetivo={anoLetivo}
          bimestre={bimestre as number || 1}
          disciplinaId={disciplinaId as number || undefined}
        />
        </Box>
      </Box>
    </MainLayout>
  );
};

export default RelatoriosPage;
