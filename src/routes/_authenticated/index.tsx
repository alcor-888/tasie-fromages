import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useEffect, useRef } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, Phone, Lock, Mail, Sparkles } from "lucide-react";

import heroImage from "@/assets/hero-cheese.jpg";
import logoAsset from "@/assets/logo.png.asset.json";
import logoSeal from "@/assets/logo-seal.png.asset.json";
import type { Cheese } from "@/data/cheeses";
import { listProducts } from "@/lib/products.functions";
import { useFilters, type ActiveList } from "@/lib/filter-context";
import { CheeseCard } from "@/components/cheese-card";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 24;

const cheesesQuery = queryOptions({
  queryKey: ["products-all"],
  queryFn: () => listProducts({ data: { listType: "all" } }),
  staleTime: 60_000,
});

const curatedQuery = queryOptions({
  queryKey: ["products-curated"],
  queryFn: () => listProducts({ data: { listType: "curated" } }),
  staleTime: 60_000,
});

const promotionsQuery = queryOptions({
  queryKey: ["products-promotions"],
  queryFn: () => listProducts({ data: { listType: "promotions" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "La Cave Tasie Fromages — Sélection artisanale & commande en ligne" },
      { name: "description", content: "Vitrine de fromages artisanaux : trouvez, triez et réservez vos fromages préférés. Retrait en boutique, sans paiement en ligne." },
      { property: "og:title", content: "La Cave Tasie Fromages" },
      { property: "og:description", content: "Sélection de fromages d'exception. Réservez en ligne, retirez en boutique." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(cheesesQuery),
    context.queryClient.ensureQueryData(curatedQuery),
    context.queryClient.ensureQueryData(promotionsQuery),
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
  const { data: promotions } = useSuspenseQuery(promotionsQuery);
  const { search, category, milk, sort, activeList, setActiveList, page, setPage } = useFilters();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleCount = page * PAGE_SIZE;

  const promoIds = useMemo(
    () => new Set(promotions.map((p: Cheese) => p.id)),
    [promotions],
  );

  const filtered = useMemo(() => {
    const source: Cheese[] =
      activeList === "promotion" ? promotions : activeList === "selection" ? curated : cheeses;
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = norm(search.trim());
    let list = source.filter((c: Cheese) => {
      if (category !== "all" && c.category !== category) return false;
      if (milk !== "all" && c.milk !== milk) return false;
      if (search && !`${c.name} ${c.region ?? ""} ${c.description ?? ""} ${c.producer ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (q) {
        const rank = (c: Cheese) => {
          const name = norm(c.name);
          if (name === q) return 0;
          if (name.startsWith(q)) return 1;
          if (name.split(/\s+/).some((w) => w.startsWith(q))) return 2;
          if (name.includes(q)) return 3;
          return 4;
        };
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
      }
      if (sort === "price-asc") return a.pricePerKg - b.pricePerKg;
      if (sort === "price-desc") return b.pricePerKg - a.pricePerKg;
      if (sort === "age") return (b.age ?? "").localeCompare(a.age ?? "");
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [cheeses, promotions, curated, search, category, milk, sort, activeList]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPage(page + 1);
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, filtered.length, page, setPage]);

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
            <img src={logoSeal.url} alt="Tasie Fromages" className="h-36 w-auto" />
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
            <button
              onClick={() => scrollToSelection("promotion")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition-all ${
                activeList === "promotion"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground hover:bg-accent border border-border"
              }`}
            >
              Promotions
            </button>
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
            <p className="mb-4 text-xs uppercase tracking-[0.4em] text-primary">fondée en 2008</p>
            <img src={logoAsset.url} alt="Tasie Fromages par Rodolphe Bardet" className="mx-auto w-full max-w-xs md:max-w-lg" />
            <p className="-mt-8 text-lg leading-relaxed text-muted-foreground whitespace-nowrap">
              Une sélection de fromages et charcuteries à découvrir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#selection">Découvrer ma sélection du moment</a>
              </Button>
              <Button
                size="lg"
                asChild
                className="relative overflow-hidden border-0 font-display font-bold uppercase tracking-[0.18em] text-[color:var(--promo-foreground)] shadow-[var(--shadow-promo)] ring-1 ring-white/25 hover:opacity-95"
                style={{ background: "var(--gradient-promo)" }}
              >
                <Link to="/promotions" className="gap-2">
                  <Sparkles className="h-4 w-4 drop-shadow" strokeWidth={2.5} />
                  Accès aux promotions
                  <span
                    aria-hidden
                    className="promo-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-overlay"
                  />
                </Link>
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

          {(() => {
            const total =
              activeList === "promotion" ? promotions.length
              : activeList === "selection" ? curated.length
              : cheeses.length;
            const hasActiveFilters =
              search.trim() !== "" || category !== "all" || milk !== "all";
            return (
              <div id="results" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 scroll-mt-32">
                <p className="text-sm text-muted-foreground">
                  <span className="font-display text-lg font-semibold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  résultat{filtered.length > 1 ? "s" : ""}{" "}
                  {filtered.length !== total ? `sur ${total}` : "disponibles"}
                </p>
                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {search.trim() && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                        « {search.trim()} »
                      </span>
                    )}
                    {category !== "all" && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                        {category}
                      </span>
                    )}
                    {milk !== "all" && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                        {milk}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
              Aucun fromage ne correspond à vos critères.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((c: Cheese, i: number) => (
                  <CheeseCard key={c.id} cheese={c} index={i} promotion={promoIds.has(c.id)} />
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="mt-10 flex flex-col items-center gap-4">
                  <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: Math.min(4, filtered.length - visibleCount) }).map((_, i) => (
                      <Skeleton key={i} className="h-60 w-full" />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                  >
                    Afficher plus ({filtered.length - visibleCount} restants)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Message */}
      <section id="commander" className="border-t border-border bg-secondary/20">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <blockquote className="relative">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-display text-6xl text-primary/20 select-none" aria-hidden="true">"</span>
            <p className="text-xl font-medium leading-[1.8] text-foreground md:text-2xl">
              Mes très chers clientes et clients, merci d'avoir parcouru notre vitrine de produits.
              Rien de plus simple que de réserver vos produits habituels et de découvrir notre sélection
              et surtout profiter de nos promotions. Découvrez d'autres fromages, d'autres saveurs,
              d'autres terroirs… Vos clients vous en seront gré. Vous pouvez nous poser vos questions,
              nous informer d'éléments particuliers sur l'espace "notes" du bon de commande.
              Tasie Fromages est à votre écoute et à votre service.
            </p>
            <footer className="mt-8 text-sm font-semibold uppercase tracking-widest text-primary">
              Bien à vous — Rodolphe Bardet
            </footer>
          </blockquote>
        </div>
      </section>


      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col items-center gap-8 text-center">
            <img src={logoSeal.url} alt="Tasie Fromages" className="h-52 w-auto" />
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.4em] text-primary">fondée en 2008</p>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Une sélection de fromages et charcuteries à découvrir.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3 sm:gap-12">
              <div className="flex flex-col items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Adresse</p>
                <p className="text-sm text-muted-foreground">Sainte Anastasie sur Issole</p>
                <p className="text-sm text-muted-foreground">89136 (Centre Var)</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Téléphone</p>
                <p className="text-sm text-muted-foreground">06 47 83 15 79</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Courriel</p>
                <p className="text-sm text-muted-foreground">bardet.rodolphe@gmail.com</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Tasie Fromages — par Rodolphe Bardet — Aucun paiement en ligne
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
