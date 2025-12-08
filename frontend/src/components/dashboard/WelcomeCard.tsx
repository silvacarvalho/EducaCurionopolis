import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface WelcomeCardProps {
  userName: string;
  subtitle: string;
  backgroundGradient?: string;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  userName,
  subtitle,
  backgroundGradient = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
}) => {
  return (
    <Card
      sx={{
        background: backgroundGradient,
        color: 'white',
        mb: 4,
        boxShadow: '0 8px 24px rgba(25,118,210,0.25)',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            mb: 1,
          }}
        >
          Bem-vindo, {userName}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            opacity: 0.9,
            fontSize: '1rem',
          }}
        >
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;