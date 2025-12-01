import React, { useEffect, useRef } from 'react';
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
  const { user, loading } = useAuth();
  const { showPermissionDenied } = useNotification();
  const notificationShownRef = useRef(false);

  const isAuthenticated = !!user;
  const hasPermission = isAuthenticated && allowedProfiles.includes(user.perfil);

  // Importante: chamar o hook em todas as renderizações para manter a ordem estável
  useEffect(() => {
    if (isAuthenticated && !hasPermission && !notificationShownRef.current) {
      notificationShownRef.current = true;
      showPermissionDenied(allowedProfiles);
    }
  }, [isAuthenticated, hasPermission, allowedProfiles, showPermissionDenied]);

  // Decisões de navegação após os hooks, para não quebrar a ordem
  if (loading) return <></>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasPermission) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};
