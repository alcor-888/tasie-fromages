import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import logoAsset from "@/assets/logo.png.asset.json";
import type { Cheese } from "@/data/cheeses";
import { listProducts } from "@/lib/products.functions";
import { useFilters } from "@/lib/filter-context";
import { CheeseCard } from "@/components/cheese-card";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const promotionsQuery = queryOptions({
  queryKey: ["products-promotions"],
  queryFn: () => listProducts({ data: { listType: "promotions" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions du moment — Tasie Fromages" },
      { name: "description", content: "Découvrez les promotions en cours sur notre sélection de fromages et charcuteries premium." },
      { property: "og:title", content: "Promotions du moment — Tasie Fromages" },
      { property: "og:description", content: "Découvrez les promotions en cours sur notre sélection de fromages et charcuteries premium." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(promotionsQuery),
  pendingComponent: () => (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-24 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full" />
      ))}
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="font-display text-2xl">Impossible de charger les promotions.</p>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: PromotionsPage,
});

function PromotionsPage() {
  const { data: promotions } = useSuspenseQuery(promotionsQuery);
  const { search, category, milk, sort } = useFilters();

  const filtered = useMemo(() => {
    let list = promotions.filter((c: Cheese) => {
      if (category !== "all" && c.category !== category) return false;
      if (milk !== "all" && c.milk !== milk) return false;
      if (search && !`${c.name} ${c.region ?? ""} ${c.description ?? ""} ${c.producer ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.pricePerKg - b.pricePerKg;
      if (sort === "price-desc") return b.pricePerKg - a.pricePerKg;
      if (sort === "age") return (b.age ?? "").localeCompare(a.age ?? "");
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [promotions, search, category, milk, sort]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <img src={logoAsset.url} alt="Tasie Fromages" className="h-10 w-auto" />
          </Link>
          <div className="hidden flex-wrap items-center justify-center gap-2 md:flex">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/admin"><Lock className="h-3.5 w-3.5" /> Admin</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero promotions */}
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-6 md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-primary">Offres spéciales</p>
            <h1 className="font-display text-4xl font-semibold md:text-5xl">Promotions du moment</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Découvrez les dernières promotions pour faire de bonnes affaires. Triez, filtrez et composez votre prochaine commande. Vos clients méritent le meilleur. Tasie Fromages à votre service. Rodolphe
            </p>
          </motion.div>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-6 py-6 md:py-10">
        <div className="sticky top-16 z-30 mb-8">
          <SearchFilterBar cheeses={promotions} />
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""} en promotion
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
            Aucune promotion ne correspond à vos critères.
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link to="/">Voir tous les produits</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c: Cheese, i: number) => (
              <CheeseCard key={c.id} cheese={c} index={i} promotion />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tasie Fromages — par Rodolphe Bardet — Aucun paiement en ligne · retrait uniquement en boutique
      </footer>
    </div>
  );
}
