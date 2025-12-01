import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PerfilUsuario } from '../types';

interface PermissionConfig {
  allowedProfiles: PerfilUsuario[];
  message?: string;
}

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (allowedProfiles: PerfilUsuario[]): boolean => {
    if (!user) return false;
    return allowedProfiles.includes(user.perfil);
  };

  const checkPermission = (config: PermissionConfig): { allowed: boolean; message: string } => {
    const allowed = hasPermission(config.allowedProfiles);

    if (!allowed) {
      const profileLabels: Record<PerfilUsuario, string> = {
        [PerfilUsuario.GESTAO_MUNICIPAL]: 'Gestão Municipal',
        [PerfilUsuario.DIRETOR_COORDENADOR]: 'Diretor/Coordenador',
        [PerfilUsuario.PROFESSOR]: 'Professor',
        [PerfilUsuario.COMUNIDADE]: 'Comunidade',
      };

      const allowedLabels = config.allowedProfiles.map(p => profileLabels[p]).join(', ');
      const message = config.message || `Acesso restrito a: ${allowedLabels}`;

      return { allowed: false, message };
    }

    return { allowed: true, message: '' };
  };

  // Atalhos para perfis específicos
  const isGestaoMunicipal = user?.perfil === PerfilUsuario.GESTAO_MUNICIPAL;
  const isDiretor = user?.perfil === PerfilUsuario.DIRETOR_COORDENADOR;
  const isProfessor = user?.perfil === PerfilUsuario.PROFESSOR;
  const isComunidade = user?.perfil === PerfilUsuario.COMUNIDADE;

  // Verificações combinadas comuns
  const canManageDiagnostics = isGestaoMunicipal;
  const canApplyDiagnostics = isProfessor;
  const canViewReports = isGestaoMunicipal || isDiretor || isProfessor;
  const canEditSchoolData = isGestaoMunicipal || isDiretor;
  const canManageSchools = isGestaoMunicipal;

  return {
    user,
    hasPermission,
    checkPermission,
    // Flags de perfil
    isGestaoMunicipal,
    isDiretor,
    isProfessor,
    isComunidade,
    // Permissões compostas
    canManageDiagnostics,
    canApplyDiagnostics,
    canViewReports,
    canEditSchoolData,
    canManageSchools,
  };
};

// Componente helper para ocultar elementos baseado em permissão
export interface PermissionGateProps {
  allowedProfiles: PerfilUsuario[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  allowedProfiles,
  children,
  fallback = null
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(allowedProfiles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
