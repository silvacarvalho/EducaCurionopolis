import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Slider,
  TextField,
  Alert,
  Grid,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import {
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { configuracoesGraficoAPI } from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface ChartConfig {
  bar_width: number;
  chart_height: number;
  colors: string[];
  default_chart_type: 'bar' | 'pie';
}

const SAMPLE_DATA = [
  { label: 'Escola A', value: 45 },
  { label: 'Escola B', value: 32 },
  { label: 'Escola C', value: 28 },
  { label: 'Escola D', value: 51 },
];

const ConfiguracoesGraficoPage: React.FC = () => {
  const [config, setConfig] = useState<ChartConfig>({
    bar_width: 40,
    chart_height: 400,
    colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'],
    default_chart_type: 'bar',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await configuracoesGraficoAPI.get();
      setConfig(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await configuracoesGraficoAPI.update(config);
      setSuccess('Configurações salvas com sucesso!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await configuracoesGraficoAPI.reset();
      setConfig(response.data);
      setSuccess('Configurações restauradas com sucesso!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao restaurar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleBarWidthChange = (_: Event, value: number | number[]) => {
    setConfig({ ...config, bar_width: value as number });
  };

  const handleChartHeightChange = (_: Event, value: number | number[]) => {
    setConfig({ ...config, chart_height: value as number });
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...config.colors];
    newColors[index] = color;
    setConfig({ ...config, colors: newColors });
  };

  const handleAddColor = () => {
    setConfig({ ...config, colors: [...config.colors, '#000000'] });
  };

  const handleRemoveColor = (index: number) => {
    if (config.colors.length <= 1) {
      setError('Deve haver pelo menos uma cor');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const newColors = config.colors.filter((_, i) => i !== index);
    setConfig({ ...config, colors: newColors });
  };

  return (
    <MainLayout title="Configurações de Gráficos">
      <Box sx={{ width: '100%', height: '100%' }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Configuration Panel */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaletteIcon />
                Configurações
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {/* Bar Width */}
              <Box sx={{ mb: 4 }}>
                <Typography gutterBottom>
                  Largura das Barras: {config.bar_width}px
                </Typography>
                <Slider
                  value={config.bar_width}
                  onChange={handleBarWidthChange}
                  min={20}
                  max={100}
                  step={5}
                  marks
                  valueLabelDisplay="auto"
                  disabled={loading}
                />
              </Box>

              {/* Chart Height */}
              <Box sx={{ mb: 4 }}>
                <Typography gutterBottom>
                  Altura do Gráfico: {config.chart_height}px
                </Typography>
                <Slider
                  value={config.chart_height}
                  onChange={handleChartHeightChange}
                  min={300}
                  max={800}
                  step={50}
                  marks
                  valueLabelDisplay="auto"
                  disabled={loading}
                />
              </Box>

              {/* Default Chart Type */}
              <Box sx={{ mb: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Gráfico Padrão</InputLabel>
                  <Select
                    value={config.default_chart_type}
                    label="Tipo de Gráfico Padrão"
                    onChange={(e) => setConfig({ ...config, default_chart_type: e.target.value as 'bar' | 'pie' })}
                    disabled={loading}
                  >
                    <MenuItem value="bar">Barras</MenuItem>
                    <MenuItem value="pie">Pizza</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Colors */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">Cores do Gráfico</Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddColor}
                    disabled={loading}
                  >
                    Adicionar
                  </Button>
                </Box>

                {config.colors.map((color, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                    <TextField
                      type="color"
                      value={color}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      sx={{ width: 80 }}
                      disabled={loading}
                    />
                    <TextField
                      value={color}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      size="small"
                      fullWidth
                      disabled={loading}
                      placeholder="#000000"
                    />
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveColor(index)}
                      disabled={loading || config.colors.length <= 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={loading}
                  fullWidth
                >
                  Salvar Configurações
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ResetIcon />}
                  onClick={handleReset}
                  disabled={loading}
                  fullWidth
                >
                  Restaurar Padrões
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Preview Panel */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Pré-visualização
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {/* Bar Chart Preview */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Gráfico de Barras
                  </Typography>
                  <Box sx={{ width: '100%', height: config.chart_height }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SAMPLE_DATA}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Quantidade" barSize={config.bar_width}>
                          {SAMPLE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>

              {/* Pie Chart Preview */}
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Gráfico de Pizza
                  </Typography>
                  <Box sx={{ width: '100%', height: config.chart_height }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={SAMPLE_DATA}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {SAMPLE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default ConfiguracoesGraficoPage;
