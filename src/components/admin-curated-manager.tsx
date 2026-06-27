import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { Trash2, Plus, Search } from "lucide-react";
import { listCheeses } from "@/lib/cheeses.functions";
import { listCurated, addToList, removeFromList, type ListType } from "@/lib/curated.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const cheesesQ = queryOptions({ queryKey: ["cheeses"], queryFn: () => listCheeses(), staleTime: 5 * 60_000 });
const curatedQ = queryOptions({ queryKey: ["curated-lists"], queryFn: () => listCurated(), staleTime: 60_000 });

export function CuratedManager({ listType, title }: { listType: ListType; title: string }) {
  const { data: cheeses = [] } = useQuery(cheesesQ);
  const { data: curated } = useQuery(curatedQ);
  const qc = useQueryClient();
  const add = useServerFn(addToList);
  const remove = useServerFn(removeFromList);
  const [search, setSearch] = useState("");

  const inList = useMemo(
    () => new Set((curated ?? []).filter((c) => c.list_type === listType).map((c) => c.cheese_id)),
    [curated, listType],
  );

  const selected = cheeses.filter((c) => inList.has(c.id));
  const available = cheeses.filter((c) => !inList.has(c.id) && (
    !search || `${c.name} ${c.region ?? ""}`.toLowerCase().includes(search.toLowerCase())
  )).slice(0, 30);

  const addMut = useMutation({
    mutationFn: (c: { id: string; name: string }) => add({ data: { cheese_id: c.id, cheese_name: c.name, list_type: listType } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curated-lists"] }); toast.success("Ajouté à la liste"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rmMut = useMutation({
    mutationFn: (id: string) => remove({ data: { cheese_id: id, list_type: listType } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curated-lists"] }); toast.success("Retiré de la liste"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">{title} — {selected.length} produit{selected.length > 1 ? "s" : ""}</h3>
        {selected.length === 0 ? (
          <p className="rounded border border-dashed border-border p-6 text-sm text-muted-foreground">Aucun produit dans cette liste.</p>
        ) : (
          <ul className="divide-y divide-border rounded border border-border bg-card">
            {selected.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{[c.region, c.priceLabel].filter(Boolean).join(" · ")}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => rmMut.mutate(c.id)} disabled={rmMut.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">Ajouter un produit</h3>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-9" />
        </div>
        <ul className="max-h-[480px] divide-y divide-border overflow-auto rounded border border-border bg-card">
          {available.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{[c.region, c.priceLabel].filter(Boolean).join(" · ")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => addMut.mutate({ id: c.id, name: c.name })} disabled={addMut.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {available.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">Aucun résultat.</li>
          )}
        </ul>
      </section>
    </div>
  );
}