import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';

interface Stat {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'success' | 'warning' | 'error';
}

interface DashboardStatsProps {
  stats: Stat[];
}

const colorMap = {
  primary: '#1976d2',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUpIcon fontSize="small" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" />;
      default:
        return <RemoveIcon fontSize="small" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return '#2e7d32';
      case 'down':
        return '#d32f2f';
      default:
        return '#64748b';
    }
  };

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card
            sx={{
              height: '100%',
              borderLeft: `4px solid ${colorMap[stat.color || 'primary']}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <CardContent>
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#1e293b',
                  my: 1,
                }}
              >
                {stat.value}
              </Typography>
              {stat.trend && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: getTrendColor(stat.trend.direction),
                  }}
                >
                  {getTrendIcon(stat.trend.direction)}
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    {stat.trend.value}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default DashboardStats;