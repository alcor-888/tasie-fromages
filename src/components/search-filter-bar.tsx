import { useMemo, useState, useRef, useEffect } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFilters } from "@/lib/filter-context";
import type { Cheese } from "@/data/cheeses";

export function SearchFilterBar({ cheeses }: { cheeses: Cheese[] }) {
  const { search, setSearch, milk, setMilk, sort, setSort, reset } = useFilters();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const milks = useMemo(
    () => Array.from(new Set(cheeses.map((c) => c.milk).filter(Boolean) as string[])).sort(),
    [cheeses],
  );

  // Vocabulaire issu des colonnes "Nom" (B) et "Type" (C) — mots uniques.
  const vocabulary = useMemo(() => {
    const words = new Set<string>();
    for (const c of cheeses) {
      const raw = `${c.name ?? ""} ${c.typeDesc ?? ""}`;
      for (const w of raw.split(/[\s,;/()\-]+/)) {
        const trimmed = w.trim();
        if (trimmed.length >= 2) words.add(trimmed);
      }
    }
    return Array.from(words).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }, [cheeses]);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const suggestions = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return [] as string[];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const w of vocabulary) {
      const nw = normalize(w);
      if (nw === q) continue;
      if (nw.startsWith(q)) starts.push(w);
      else if (nw.includes(q)) contains.push(w);
      if (starts.length >= 12) break;
    }
    return [...starts, ...contains].slice(0, 10);
  }, [vocabulary, search]);

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const commit = (value: string) => {
    setSearch(value);
    setOpen(false);
  };

  const runSearch = () => {
    setOpen(false);
    // If we are not on the listing page, go there so results are visible.
    if (pathname !== "/") {
      navigate({ to: "/", hash: "results" });
      return;
    }
    if (typeof document !== "undefined") {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        runSearch();
      }}
      className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto_auto]"
    >
      <div className="relative" ref={wrapperRef}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (h + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit(suggestions[highlight]);
              runSearch();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Rechercher un fromage, une région…"
          className="pl-9 pr-9"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-autocomplete="list"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setOpen(false);
            }}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {open && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(s);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer rounded px-3 py-1.5 text-sm ${
                  i === highlight ? "bg-accent text-accent-foreground" : "text-foreground"
                }`}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Select value={milk} onValueChange={setMilk}>
        <SelectTrigger className="md:w-[180px]">
          <SelectValue placeholder="Type de lait" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les laits</SelectItem>
          {milks.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => setSort(v as "name" | "price-asc" | "price-desc" | "age")}>
        <SelectTrigger className="md:w-[180px]">
          <SelectValue placeholder="Trier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Trier : Nom (A→Z)</SelectItem>
          <SelectItem value="price-asc">Prix croissant</SelectItem>
          <SelectItem value="price-desc">Prix décroissant</SelectItem>
          <SelectItem value="age">Affinage</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2 md:justify-end">
        <Button type="submit" className="gap-1.5">
          <Search className="h-4 w-4" />
          Rechercher
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="gap-1.5"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </Button>
      </div>
    </form>
  );
}
