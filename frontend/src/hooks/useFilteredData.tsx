import { useMemo } from 'react';
import { useContextualSearch } from '../contexts/ContextualSearchContext';

/**
 * Hook para filtrar dados baseado na busca contextual
 * 
 * @param data - Array de dados a ser filtrado
 * @param searchFields - Campos do objeto a serem pesquisados
 * @returns Array filtrado
 * 
 * @example
 * const filteredEscolas = useFilteredData(escolas, ['nome', 'codigo_inep']);
 */
export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  searchFields: (keyof T)[]
): T[] {
  const { searchQuery } = useContextualSearch();

  return useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return data;
    }

    const query = searchQuery.toLowerCase().trim();

    return data.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        
        if (value === null || value === undefined) {
          return false;
        }

        const stringValue = String(value).toLowerCase();
        return stringValue.includes(query);
      });
    });
  }, [data, searchQuery, searchFields]);
}
