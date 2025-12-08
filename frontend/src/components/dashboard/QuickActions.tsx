import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  icon: string;
  label: string;
  path: string;
  description?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions, title = 'Ações Rápidas' }) => {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: '#1e293b',
            mb: 3,
          }}
        >
          {title}
        </Typography>
        <Grid container spacing={2}>
          {actions.map((action, index) => (
            <Grid item xs={6} sm={4} md={2} key={index}>
              <Card
                onClick={() => navigate(action.path)}
                sx={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: 2,
                  border: '2px solid #e2e8f0',
                  borderRadius: 2,
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: '#1976d2',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 20px rgba(25,118,210,0.15)',
                  },
                }}
              >
                <Box
                  sx={{
                    fontSize: '2rem',
                    mb: 1,
                  }}
                >
                  {action.icon}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '0.85rem',
                  }}
                >
                  {action.label}
                </Typography>
                {action.description && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#64748b',
                      mt: 0.5,
                      display: 'block',
                    }}
                  >
                    {action.description}
                  </Typography>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QuickActions;