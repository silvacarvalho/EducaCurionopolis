/**
 * Drill-Down Chart Component
 * Interactive chart that allows drilling down into data by clicking
 */
import React, { useState } from 'react';
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
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { DrillDownData } from '../types';

interface DrillDownChartProps {
  title: string;
  data: DrillDownData[];
  loading?: boolean;
  error?: string;
  onDrillDown?: (item: DrillDownData) => void;
  breadcrumbs?: { label: string; onClick?: () => void }[];
  chartType?: 'bar' | 'pie';
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
];

const DrillDownChart: React.FC<DrillDownChartProps> = ({
  title,
  data,
  loading = false,
  error,
  onDrillDown,
  breadcrumbs = [],
  chartType: initialChartType = 'bar',
  colors = DEFAULT_COLORS,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>(initialChartType);

  const handleBarClick = (data: any) => {
    if (onDrillDown && data) {
      const originalData = data.payload;
      onDrillDown(originalData);
    }
  };

  const handlePieClick = (data: any) => {
    if (onDrillDown) {
      onDrillDown(data);
    }
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill="#666"
        textAnchor="middle"
        fontSize={12}
      >
        {value}
      </text>
    );
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando dados...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">Nenhum dado disponível</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>

        {/* Breadcrumbs for navigation */}
        {breadcrumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 2 }}>
            {breadcrumbs.map((crumb, index) => (
              <Link
                key={index}
                component="button"
                variant="body2"
                onClick={crumb.onClick}
                sx={{
                  cursor: crumb.onClick ? 'pointer' : 'default',
                  textDecoration: crumb.onClick ? 'underline' : 'none',
                }}
              >
                {crumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        )}

        {/* Chart type toggle */}
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(_, newType) => newType && setChartType(newType)}
          size="small"
        >
          <ToggleButton value="bar">Barras</ToggleButton>
          <ToggleButton value="pie">Pizza</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Chart */}
      <Box sx={{ width: '100%', height: 400 }}>
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              onClick={handleBarClick}
              style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {data.label}
                        </Typography>
                        <Typography variant="body2">
                          Total: {data.value}
                        </Typography>
                        {data.percentage !== undefined && (
                          <Typography variant="body2">
                            Percentual: {data.percentage.toFixed(2)}%
                          </Typography>
                        )}
                        {/* Show detailed breakdown if available */}
                        {data.abaixo_media !== undefined && (
                          <>
                            <Typography variant="body2" color="error">
                              Abaixo da Média: {data.abaixo_media} (
                              {data.percentual_abaixo?.toFixed(2)}%)
                            </Typography>
                            <Typography variant="body2" color="warning.main">
                              Na Média: {data.na_media} (
                              {data.percentual_na?.toFixed(2)}%)
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              Acima da Média: {data.acima_media} (
                              {data.percentual_acima?.toFixed(2)}%)
                            </Typography>
                          </>
                        )}
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="value" name="Quantidade" label={renderCustomBarLabel}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                onClick={handlePieClick}
                style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {data.label}
                        </Typography>
                        <Typography variant="body2">
                          Total: {data.value}
                        </Typography>
                        {data.percentage !== undefined && (
                          <Typography variant="body2">
                            Percentual: {data.percentage.toFixed(2)}%
                          </Typography>
                        )}
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Instructions */}
      {onDrillDown && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Clique em uma barra ou fatia para ver detalhes
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default DrillDownChart;
