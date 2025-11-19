import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Notification {
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor, duration?: number) => void;
  showPermissionDenied: (allowedProfiles: string[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, severity: AlertColor = 'info', duration: number = 6000) => {
    setNotification({ message, severity, duration });
  };

  const showPermissionDenied = (allowedProfiles: string[]) => {
    const profileLabels: Record<string, string> = {
      'gestao_municipal': 'Gestão Municipal',
      'diretor_coordenador': 'Diretor/Coordenador',
      'professor': 'Professor',
      'comunidade': 'Comunidade'
    };

    const allowedLabels = allowedProfiles.map(p => profileLabels[p] || p).join(', ');

    showNotification(
      `⛔ Acesso Negado! Esta funcionalidade está disponível apenas para: ${allowedLabels}`,
      'error',
      8000
    );
  };

  const handleClose = () => {
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showPermissionDenied }}>
      {children}
      <Snackbar
        open={!!notification}
        autoHideDuration={notification?.duration || 6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%', fontSize: '1rem', fontWeight: 500 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
