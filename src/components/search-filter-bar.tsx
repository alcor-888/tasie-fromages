import { useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFilters } from "@/lib/filter-context";
import type { Cheese } from "@/data/cheeses";

export function SearchFilterBar({ cheeses }: { cheeses: Cheese[] }) {
  const { search, setSearch, category, setCategory, milk, setMilk, sort, setSort } = useFilters();

  const categories = useMemo(
    () => Array.from(new Set(cheeses.map((c) => c.category).filter(Boolean) as string[])).sort(),
    [cheeses],
  );
  const milks = useMemo(
    () => Array.from(new Set(cheeses.map((c) => c.milk).filter(Boolean) as string[])).sort(),
    [cheeses],
  );

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un fromage, une région…"
          className="pl-9"
        />
      </div>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="md:w-[180px]">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes catégories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={milk} onValueChange={setMilk}>
        <SelectTrigger className="md:w-[150px]">
          <SelectValue placeholder="Lait" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous laits</SelectItem>
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
    </div>
  );
}
