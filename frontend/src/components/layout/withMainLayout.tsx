import React, { useState, useEffect } from 'react';
import MainLayout from './MainLayout';
import MainLayoutTailwind from './MainLayoutTailwind';
import { Palette, Code } from '@mui/icons-material';

/**
 * HOC (Higher-Order Component) para adicionar o MainLayout a qualquer página
 * Com A/B Testing entre MUI e Tailwind
 *
 * Uso:
 * export default withMainLayout(MinhaPage, 'Título da Página');
 */
export const withMainLayout = <P extends object>(
  Component: React.ComponentType<P>,
  title?: string
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    // Recuperar preferência do localStorage
    const [useTailwind, setUseTailwind] = useState(() => {
      const saved = localStorage.getItem('layoutVersion');
      return saved === 'tailwind';
    });

    // Salvar preferência no localStorage
    useEffect(() => {
      localStorage.setItem('layoutVersion', useTailwind ? 'tailwind' : 'mui');
    }, [useTailwind]);

    const toggleLayout = () => {
      setUseTailwind(!useTailwind);
    };

    const Layout = useTailwind ? MainLayoutTailwind : MainLayout;

    return (
      <Layout title={title}>
        {/* Botão de Toggle A/B Test */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={toggleLayout}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 group"
            title={`Trocar para ${useTailwind ? 'Material-UI' : 'Tailwind CSS'}`}
          >
            {useTailwind ? (
              <>
                <Palette className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Material-UI</span>
              </>
            ) : (
              <>
                <Code className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Tailwind CSS</span>
              </>
            )}
          </button>
          <div className="mt-2 text-center">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-purple-600 bg-purple-100 rounded-full">
              Versão: {useTailwind ? 'Tailwind' : 'MUI'}
            </span>
          </div>
        </div>

        <Component {...props} />
      </Layout>
    );
  };

  WrappedComponent.displayName = `withMainLayout(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default withMainLayout;
