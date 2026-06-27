import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type SortKey = "name" | "price-asc" | "price-desc" | "age";
export type ActiveList = "all" | "promotion" | "selection";

interface FilterState {
  search: string;
  category: string;
  milk: string;
  sort: SortKey;
  activeList: ActiveList;
}

interface FilterContextType extends FilterState {
  setSearch: (v: string) => void;
  setCategory: (v: string) => void;
  setMilk: (v: string) => void;
  setSort: (v: SortKey) => void;
  setActiveList: (v: ActiveList) => void;
  reset: () => void;
}

const defaultState: FilterState = {
  search: "",
  category: "all",
  milk: "all",
  sort: "name",
  activeList: "all",
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FilterState>(defaultState);

  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, search })), []);
  const setCategory = useCallback((category: string) => setState((s) => ({ ...s, category })), []);
  const setMilk = useCallback((milk: string) => setState((s) => ({ ...s, milk })), []);
  const setSort = useCallback((sort: SortKey) => setState((s) => ({ ...s, sort })), []);
  const setActiveList = useCallback((activeList: ActiveList) => setState((s) => ({ ...s, activeList })), []);
  const reset = useCallback(() => setState(defaultState), []);

  return (
    <FilterContext.Provider value={{ ...state, setSearch, setCategory, setMilk, setSort, setActiveList, reset }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
