/**
 * Authentication Context
 * Manages user authentication state and operations
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { Usuario, LoginCredentials, PerfilUsuario } from '../types';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: PerfilUsuario[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and fetch user data
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');

      if (token) {
        try {
          const response = await authAPI.me();
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authAPI.login(credentials.email, credentials.senha);
      const { access_token } = response.data;

      // Store token
      localStorage.setItem('access_token', access_token);

      // Fetch user data
      const userResponse = await authAPI.me();
      setUser(userResponse.data);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(
        error.response?.data?.detail || 'Falha ao fazer login. Verifique suas credenciais.'
      );
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (roles: PerfilUsuario[]): boolean => {
    if (!user) return false;
    return roles.includes(user.perfil);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
