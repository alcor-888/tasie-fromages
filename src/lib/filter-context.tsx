import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

export type SortKey = "name" | "price-asc" | "price-desc" | "age";
export type ActiveList = "all" | "promotion" | "selection";

interface FilterContextType {
  search: string;
  category: string;
  milk: string;
  sort: SortKey;
  activeList: ActiveList;
  page: number;
  setSearch: (v: string) => void;
  setCategory: (v: string) => void;
  setMilk: (v: string) => void;
  setSort: (v: SortKey) => void;
  setActiveList: (v: ActiveList) => void;
  setPage: (v: number) => void;
  reset: () => void;
}

const defaults = {
  q: "",
  cat: "all",
  milk: "all",
  sort: "name" as SortKey,
  list: "all" as ActiveList,
  page: 1,
};

const FilterContext = createContext<FilterContextType | null>(null);

type RawSearch = Record<string, unknown>;

function readString(s: RawSearch, key: string, fallback: string): string {
  const v = s[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

function readSort(s: RawSearch): SortKey {
  const v = s.sort;
  return v === "price-asc" || v === "price-desc" || v === "age" || v === "name" ? v : "name";
}

function readList(s: RawSearch): ActiveList {
  const v = s.list;
  return v === "promotion" || v === "selection" || v === "all" ? v : "all";
}

function readPage(s: RawSearch): number {
  const v = s.page;
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const raw = useSearch({ strict: false }) as RawSearch;
  const navigate = useNavigate();

  const state = useMemo(
    () => ({
      search: readString(raw, "q", ""),
      category: readString(raw, "cat", "all"),
      milk: readString(raw, "milk", "all"),
      sort: readSort(raw),
      activeList: readList(raw),
      page: readPage(raw),
    }),
    [raw],
  );

  const update = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      navigate({
        to: ".",
        search: (prev: RawSearch) => {
          const next: RawSearch = { ...prev, ...patch };
          // strip defaults to keep URL clean
          if (next.q === "" || next.q == null) delete next.q;
          if (next.cat === "all" || next.cat == null) delete next.cat;
          if (next.milk === "all" || next.milk == null) delete next.milk;
          if (next.sort === "name" || next.sort == null) delete next.sort;
          if (next.list === "all" || next.list == null) delete next.list;
          if (next.page === 1 || next.page == null) delete next.page;
          return next;
        },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const setSearch = useCallback((v: string) => update({ q: v, page: 1 }), [update]);
  const setCategory = useCallback((v: string) => update({ cat: v, page: 1 }), [update]);
  const setMilk = useCallback((v: string) => update({ milk: v, page: 1 }), [update]);
  const setSort = useCallback((v: SortKey) => update({ sort: v, page: 1 }), [update]);
  const setActiveList = useCallback((v: ActiveList) => update({ list: v, page: 1 }), [update]);
  const setPage = useCallback((v: number) => update({ page: v }), [update]);
  const reset = useCallback(() => update({ q: undefined, cat: undefined, milk: undefined, sort: undefined, list: undefined, page: undefined }), [update]);

  const value = useMemo(
    () => ({ ...state, setSearch, setCategory, setMilk, setSort, setActiveList, setPage, reset }),
    [state, setSearch, setCategory, setMilk, setSort, setActiveList, setPage, reset],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

// Kept for backwards-compat with the previous default-state constant
export const filterDefaults = defaults;
