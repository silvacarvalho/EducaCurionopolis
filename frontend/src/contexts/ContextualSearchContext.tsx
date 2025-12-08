import React, { createContext, useContext, useState, useCallback } from 'react';

interface ContextualSearchContextData {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

const ContextualSearchContext = createContext<ContextualSearchContextData>({} as ContextualSearchContextData);

export const ContextualSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <ContextualSearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        clearSearch,
      }}
    >
      {children}
    </ContextualSearchContext.Provider>
  );
};

export const useContextualSearch = () => {
  const context = useContext(ContextualSearchContext);
  if (!context) {
    throw new Error('useContextualSearch deve ser usado dentro de ContextualSearchProvider');
  }
  return context;
};
