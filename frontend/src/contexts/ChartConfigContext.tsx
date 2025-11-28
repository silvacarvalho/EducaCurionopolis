import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { configuracoesGraficoAPI } from '../services/api';

interface ChartConfig {
  bar_width: number;
  chart_height: number;
  colors: string[];
  default_chart_type: 'bar' | 'pie';
}

interface ChartConfigContextType {
  config: ChartConfig;
  loading: boolean;
  reload: () => Promise<void>;
}

const DEFAULT_CONFIG: ChartConfig = {
  bar_width: 40,
  chart_height: 400,
  colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'],
  default_chart_type: 'bar',
};

const ChartConfigContext = createContext<ChartConfigContextType>({
  config: DEFAULT_CONFIG,
  loading: false,
  reload: async () => {},
});

export const useChartConfig = () => {
  const context = useContext(ChartConfigContext);
  if (!context) {
    throw new Error('useChartConfig must be used within ChartConfigProvider');
  }
  return context;
};

interface ChartConfigProviderProps {
  children: ReactNode;
}

export const ChartConfigProvider: React.FC<ChartConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);

  const loadConfig = async () => {
    // Only load if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      setConfig(DEFAULT_CONFIG);
      return;
    }

    setLoading(true);
    try {
      const response = await configuracoesGraficoAPI.get();
      setConfig(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar configurações de gráfico:', error);
      // Use default config on error (including 401)
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const reload = async () => {
    await loadConfig();
  };

  return (
    <ChartConfigContext.Provider value={{ config, loading, reload }}>
      {children}
    </ChartConfigContext.Provider>
  );
};
