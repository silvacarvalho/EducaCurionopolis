import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { PerfilUsuario } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedProfiles: PerfilUsuario[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedProfiles,
  redirectTo = '/dashboard'
}) => {
  const { user } = useAuth();
  const { showPermissionDenied } = useNotification();

  const hasPermission = user && allowedProfiles.includes(user.perfil);

  useEffect(() => {
    if (user && !hasPermission) {
      // Mostrar notificação quando acesso é negado
      showPermissionDenied(allowedProfiles);
    }
  }, [user, hasPermission, allowedProfiles, showPermissionDenied]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
