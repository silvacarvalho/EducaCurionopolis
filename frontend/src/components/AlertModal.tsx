import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import {
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  open,
  onClose,
  title,
  message,
  type = 'error',
  confirmText = 'OK',
}) => {
  const getIcon = () => {
    const iconStyle = { fontSize: 48 };
    switch (type) {
      case 'error':
        return <ErrorIcon sx={{ ...iconStyle, color: '#ef4444' }} />;
      case 'success':
        return <SuccessIcon sx={{ ...iconStyle, color: '#22c55e' }} />;
      case 'warning':
        return <WarningIcon sx={{ ...iconStyle, color: '#f59e0b' }} />;
      case 'info':
        return <InfoIcon sx={{ ...iconStyle, color: '#3b82f6' }} />;
      default:
        return <ErrorIcon sx={{ ...iconStyle, color: '#ef4444' }} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'error':
        return 'Erro';
      case 'success':
        return 'Sucesso';
      case 'warning':
        return 'Atenção';
      case 'info':
        return 'Informação';
      default:
        return 'Erro';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'error':
        return '#ef4444';
      case 'success':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#ef4444';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          borderTop: `4px solid ${getColor()}`,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getIcon()}
          <Typography variant="h6" component="span" fontWeight="bold">
            {title || getDefaultTitle()}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body1"
          sx={{
            mt: 1,
            color: 'text.secondary',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: getColor(),
            '&:hover': {
              backgroundColor: getColor(),
              filter: 'brightness(0.9)',
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertModal;
