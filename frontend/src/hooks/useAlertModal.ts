import { useState, useCallback } from 'react';
import { AlertType } from '../components/AlertModal';

interface AlertState {
  open: boolean;
  title?: string;
  message: string;
  type: AlertType;
}

const initialState: AlertState = {
  open: false,
  title: undefined,
  message: '',
  type: 'error',
};

export const useAlertModal = () => {
  const [alertState, setAlertState] = useState<AlertState>(initialState);

  const showAlert = useCallback(
    (message: string, type: AlertType = 'error', title?: string) => {
      setAlertState({
        open: true,
        message,
        type,
        title,
      });
    },
    []
  );

  const showError = useCallback((message: string, title?: string) => {
    showAlert(message, 'error', title || 'Erro');
  }, [showAlert]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showAlert(message, 'success', title || 'Sucesso');
  }, [showAlert]);

  const showWarning = useCallback((message: string, title?: string) => {
    showAlert(message, 'warning', title || 'Atenção');
  }, [showAlert]);

  const showInfo = useCallback((message: string, title?: string) => {
    showAlert(message, 'info', title || 'Informação');
  }, [showAlert]);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, open: false }));
  }, []);

  // Helper para extrair mensagem de erro do axios
  const getErrorMessage = useCallback((error: any, fallback: string = 'Ocorreu um erro inesperado'): string => {
    if (error?.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      return error.response.data.errors.join('\n');
    }
    if (error?.message) {
      return error.message;
    }
    return fallback;
  }, []);

  // Helper para mostrar erro de uma requisição
  const showRequestError = useCallback((error: any, fallback: string = 'Ocorreu um erro inesperado') => {
    const message = getErrorMessage(error, fallback);
    showError(message);
  }, [getErrorMessage, showError]);

  return {
    alertState,
    showAlert,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    closeAlert,
    getErrorMessage,
    showRequestError,
  };
};

export default useAlertModal;
