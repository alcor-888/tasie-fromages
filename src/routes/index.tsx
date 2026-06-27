import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, Phone, Clock, Lock } from "lucide-react";

import heroImage from "@/assets/hero-cheese.jpg";
import logoAsset from "@/assets/logo.png.asset.json";
import type { Cheese } from "@/data/cheeses";
import { listCheeses } from "@/lib/cheeses.functions";
import { listCurated } from "@/lib/curated.functions";
import { useFilters, type ActiveList } from "@/lib/filter-context";
import { CheeseCard } from "@/components/cheese-card";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const cheesesQuery = queryOptions({
  queryKey: ["cheeses"],
  queryFn: () => listCheeses(),
  staleTime: 5 * 60_000,
});

const curatedQuery = queryOptions({
  queryKey: ["curated-lists"],
  queryFn: () => listCurated(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Cave Fromagère — Sélection artisanale & commande en ligne" },
      { name: "description", content: "Vitrine de fromages artisanaux : trouvez, triez et réservez vos fromages préférés. Retrait en boutique, sans paiement en ligne." },
      { property: "og:title", content: "La Cave Fromagère" },
      { property: "og:description", content: "Sélection de fromages d'exception. Réservez en ligne, retirez en boutique." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(cheesesQuery),
    context.queryClient.ensureQueryData(curatedQuery),
  ]),
  pendingComponent: () => (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-24 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full" />
      ))}
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="font-display text-2xl">Impossible de charger la sélection.</p>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: Index,
});

function Index() {
  const { data: cheeses } = useSuspenseQuery(cheesesQuery);
  const { data: curated } = useSuspenseQuery(curatedQuery);
  const { search, category, milk, sort, activeList, setActiveList } = useFilters();

  const promotionIds = useMemo(
    () => new Set(curated.filter((c) => c.list_type === "promotion").map((c) => c.cheese_id)),
    [curated],
  );
  const selectionIds = useMemo(
    () => new Set(curated.filter((c) => c.list_type === "selection").map((c) => c.cheese_id)),
    [curated],
  );

  const filtered = useMemo(() => {
    let list = cheeses.filter((c: Cheese) => {
      if (activeList === "promotion" && !promotionIds.has(c.id)) return false;
      if (activeList === "selection" && !selectionIds.has(c.id)) return false;
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
  }, [cheeses, search, category, milk, sort, activeList, promotionIds, selectionIds]);

  const scrollToSelection = (list: ActiveList) => {
    setActiveList(list);
    document.getElementById("selection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#top" className="flex items-center">
            <img src={logoAsset.url} alt="Tasie Fromages" className="h-10 w-auto" />
          </a>
          <div className="hidden flex-wrap items-center justify-center gap-2 md:flex">
            <button
              onClick={() => scrollToSelection("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition-all ${
                activeList === "all"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground hover:bg-accent border border-border"
              }`}
            >
              Liste générale
            </button>
            <Link
              to="/promotions"
              className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition-all ${
                activeList === "promotion"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground hover:bg-accent border border-border"
              }`}
            >
              Promotions
            </Link>
            <button
              onClick={() => scrollToSelection("selection")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition-all ${
                activeList === "selection"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground hover:bg-accent border border-border"
              }`}
            >
              Sélection du moment
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/admin"><Lock className="h-3.5 w-3.5" /> Admin</Link>
            </Button>
            <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
              <a href="#selection">Découvrer ma sélection du moment</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-primary">Maison fondée en 2008</p>
            <img src={logoAsset.url} alt="Tasie Fromages par Rodolphe Bardet" className="mx-auto w-full max-w-xs md:max-w-sm" />
            <p className="-mt-8 text-lg leading-relaxed text-muted-foreground whitespace-nowrap">
              Une sélection de fromages et charcuteries à découvrir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#selection">Découvrer ma sélection du moment</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/promotions">Accès aux promotions</Link>
              </Button>
            </div>
            <div className="mt-10 flex gap-8 border-t border-border pt-6 text-sm">
              <div><span className="font-display text-2xl font-semibold">300+</span><p className="text-xs uppercase tracking-wider text-muted-foreground">Produits de qualité PREMIUM</p></div>
              <div><span className="font-display text-2xl font-semibold">120+</span><p className="text-xs uppercase tracking-wider text-muted-foreground">Producteurs</p></div>
              <div><span className="font-display text-2xl font-semibold">AOP</span><p className="text-xs uppercase tracking-wider text-muted-foreground">Garantis</p></div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-2xl bg-[var(--gradient-warm)] opacity-20 blur-2xl" />
            <img
              src={heroImage}
              alt="Plateau de fromages artisanaux"
              width={1600}
              height={1100}
              className="relative aspect-[4/3] w-full rounded-xl object-cover shadow-[var(--shadow-elegant)]"
            />
          </motion.div>
        </div>
      </section>

      {/* Selection */}
      <section id="selection" className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">

          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-primary">
                {activeList === "promotion" ? "Offres spéciales" : activeList === "all" ? "Notre catalogue" : "Notre sélection"}
              </p>
              <h2 className="font-display text-4xl font-semibold md:text-5xl">
                {activeList === "promotion" ? "Promotions du moment" : activeList === "all" ? "Tous nos produits, liste générale" : "Le plateau du moment"}
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              {activeList === "promotion"
                ? "Découvrez les dernières promotions pour faire de bonnes affaires. Triez, filtrez et composez votre prochaine commande. Vos clients méritent le meilleur. Tasie Fromages à votre service. Rodolphe"
                : activeList === "all"
                ? "Découvrez tous nouveaux produits, triez, filtrez et composez votre prochaine commande. Vos clients méritent le meilleur. Tasie Fromages à votre service. Rodolphe"
                : "Découvrez de nouveaux produits, triez, filtrez et composez votre prochaine commande. Vos clients méritent le meilleur. Tasie Fromages à votre service. Rodolphe"}
            </p>
          </div>

          {/* Filters — sticky so they stay accessible while scrolling */}
          <div className="sticky top-16 z-30 mb-8">
            <SearchFilterBar cheeses={cheeses} />
          </div>

          <p className="mb-6 text-sm text-muted-foreground">
            {filtered.length} fromage{filtered.length > 1 ? "s" : ""} {filtered.length !== cheeses.length ? `sur ${cheeses.length}` : "disponibles"}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
              Aucun fromage ne correspond à vos critères.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c: Cheese, i: number) => (
                <CheeseCard key={c.id} cheese={c} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Commander */}
      <section id="commander" className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-3">
          {[
            { n: "01", t: "Composez", d: "Sélectionnez vos fromages dans la vitrine et ajustez les quantités." },
            { n: "02", t: "Réservez", d: "Indiquez la date de retrait. Aucun paiement en ligne, tout se fait en boutique." },
            { n: "03", t: "Retirez", d: "Vos fromages sont préparés à l'instant et prêts à votre arrivée." },
          ].map((s) => (
            <div key={s.n} className="border-t-2 border-primary pt-6">
              <p className="font-display text-5xl font-semibold text-primary">{s.n}</p>
              <h3 className="mt-4 font-display text-2xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Visiter */}
      <section id="visiter" className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] opacity-70">Boutique & cave d'affinage</p>
            <h2 className="font-display text-4xl font-semibold md:text-5xl">Venez nous voir.</h2>
            <p className="mt-4 max-w-md opacity-80">
              Dégustez, échangez avec nos affineurs, repartez avec vos fromages préparés le jour même.
            </p>
          </div>
          <div className="grid gap-5">
            <div className="flex gap-4"><MapPin className="h-5 w-5 flex-none opacity-70" />
              <div><p className="font-medium">12 rue des Fromagers</p><p className="text-sm opacity-70">75011 Paris</p></div>
            </div>
            <div className="flex gap-4"><Phone className="h-5 w-5 flex-none opacity-70" />
              <div><p className="font-medium">01 42 00 00 00</p><p className="text-sm opacity-70">Pour toute question ou commande spéciale</p></div>
            </div>
            <div className="flex gap-4"><Clock className="h-5 w-5 flex-none opacity-70" />
              <div><p className="font-medium">Mardi — Samedi · 9h — 19h30</p><p className="text-sm opacity-70">Dimanche matin · 9h — 13h</p></div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tasie Fromages — par Rodolphe Bardet — Aucun paiement en ligne · retrait uniquement en boutique
      </footer>
    </div>
  );
}
