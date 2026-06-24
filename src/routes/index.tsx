import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, MapPin, Phone, Clock } from "lucide-react";
import heroImage from "@/assets/hero-cheese.jpg";
import type { Cheese } from "@/data/cheeses";
import { listCheeses } from "@/lib/cheeses.functions";
import { CheeseCard } from "@/components/cheese-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const cheesesQuery = queryOptions({
  queryKey: ["cheeses"],
  queryFn: () => listCheeses(),
  staleTime: 5 * 60_000,
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
  loader: ({ context }) => context.queryClient.ensureQueryData(cheesesQuery),
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

type SortKey = "name" | "price-asc" | "price-desc" | "age";

function Index() {
  const { data: cheeses } = useSuspenseQuery(cheesesQuery);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [milk, setMilk] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const categories = useMemo(
    () => Array.from(new Set(cheeses.map((c) => c.category).filter(Boolean) as string[])).sort(),
    [cheeses],
  );
  const milks = useMemo(
    () => Array.from(new Set(cheeses.map((c) => c.milk).filter(Boolean) as string[])).sort(),
    [cheeses],
  );

  const filtered = useMemo(() => {
    let list = cheeses.filter((c: Cheese) => {
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
  }, [cheeses, search, category, milk, sort]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#top" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold">La Cave</span>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Fromagère</span>
          </a>
          <nav className="hidden gap-8 text-sm md:flex">
            <a href="#selection" className="text-muted-foreground transition-colors hover:text-foreground">Sélection</a>
            <a href="#commander" className="text-muted-foreground transition-colors hover:text-foreground">Commander</a>
            <a href="#visiter" className="text-muted-foreground transition-colors hover:text-foreground">Visiter</a>
          </nav>
          <Button asChild variant="default" size="sm">
            <a href="#selection">Découvrer ma sélection du moment</a>
          </Button>
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
            <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-7xl">
              L'art du fromage,<br />
              <span className="italic text-primary">par Rodolphe Bardet</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Une sélection de fromages, charcuteries et snacks à découvrir, réserver et livrés, lors de ma prochaine visite.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#selection">Explorer la sélection</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#visiter">Nous rendre visite</a>
              </Button>
            </div>
            <div className="mt-10 flex gap-8 border-t border-border pt-6 text-sm">
              <div><span className="font-display text-2xl font-semibold">62</span><p className="text-xs uppercase tracking-wider text-muted-foreground">Ans d'affinage</p></div>
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
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-primary">Notre sélection</p>
              <h2 className="font-display text-4xl font-semibold md:text-5xl">Le plateau du moment</h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Triez, filtrez et composez votre commande. Nous préparons vos fromages le jour de votre retrait.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto_auto]">
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
              <SelectTrigger className="md:w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={milk} onValueChange={setMilk}>
              <SelectTrigger className="md:w-[150px]"><SelectValue placeholder="Lait" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous laits</SelectItem>
                {milks.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="md:w-[180px]"><SelectValue placeholder="Trier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Trier : Nom (A→Z)</SelectItem>
                <SelectItem value="price-asc">Prix croissant</SelectItem>
                <SelectItem value="price-desc">Prix décroissant</SelectItem>
                <SelectItem value="age">Affinage</SelectItem>
              </SelectContent>
            </Select>
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
        © {new Date().getFullYear()} La Cave Fromagère — Aucun paiement en ligne · retrait uniquement en boutique
      </footer>
    </div>
  );
}
