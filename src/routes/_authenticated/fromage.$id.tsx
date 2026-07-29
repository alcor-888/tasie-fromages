import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, MapPin, Clock, Droplet, Wheat, Factory, Leaf,
  Lightbulb, ShoppingBag, Hash, Building2, Percent, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCategoryImage, type Cheese } from "@/data/cheeses";
import { getProductById, listProducts } from "@/lib/products.functions";
import { CheeseCard } from "@/components/cheese-card";
import { useCart } from "@/lib/cart-store";
import { SearchFilterBar } from "@/components/search-filter-bar";
import roseCampoDui from "@/assets/rose-campo-dui.png.asset.json";

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

const productQuery = (id: string) => queryOptions({
  queryKey: ["product-detail", id],
  queryFn: () => getProductById({ data: { id } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/fromage/$id")({
  loader: ({ context, params }) => Promise.all([
    context.queryClient.ensureQueryData(cheesesQuery),
    context.queryClient.ensureQueryData(curatedQuery),
    context.queryClient.ensureQueryData(productQuery(params.id)),
  ]),
  component: CheeseDetail,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="font-display text-3xl">Ce fromage n'est pas dans notre cave.</p>
        <Button asChild className="mt-6"><Link to="/">Retour à la sélection</Link></Button>
      </div>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <Button onClick={reset}>Réessayer</Button>
    </div>
  ),
});

function StatRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-primary" />
      <div className="flex flex-1 flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

function CheeseDetail() {
  const { id } = Route.useParams();
  const { data: cheeses } = useSuspenseQuery(cheesesQuery);
  const { data: curated } = useSuspenseQuery(curatedQuery);
  const { data: cheese } = useSuspenseQuery(productQuery(id));
  if (!cheese) throw notFound();
  const isRoseCampoDui = curated.some((c: Cheese) => c.id === cheese.id);
  const { add, setOpen, count } = useCart();
  const soldOut = cheese.stock === 0;
  const related = (() => {
    const scored = cheeses
      .filter((c: Cheese) => c.id !== cheese.id)
      .map((c: Cheese) => {
        let score = 0;
        if (c.category && c.category === cheese.category) score += 4;
        if (c.milk && c.milk === cheese.milk) score += 3;
        if (c.fabrication && c.fabrication === cheese.fabrication) score += 2;
        if (c.region && c.region === cheese.region) score += 2;
        if (c.department && c.department === cheese.department) score += 1;
        if (c.fabriquant && c.fabriquant === cheese.fabriquant) score += 2;
        const priceDelta = Math.abs((c.pricePerKg || 0) - (cheese.pricePerKg || 0));
        if (priceDelta < 5) score += 1;
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((x) => x.c);
  })();
  const image = cheese.imageUrl || getCategoryImage(cheese.category, cheese.milk);
  const hasRealPhoto = Boolean(cheese.imageUrl);
  const origin = [cheese.ville, cheese.department || cheese.region].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2 truncate">
            <span className="font-display text-lg font-semibold sm:text-2xl">La Cave</span>
            <span className="hidden text-xs uppercase tracking-[0.3em] text-muted-foreground sm:inline">Tasie Fromages</span>
          </Link>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
            <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Panier</span>{count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
      </header>

      <div className="sticky top-14 z-30 mx-auto max-w-7xl px-3 py-2 sm:top-16 sm:px-6">
        <SearchFilterBar cheeses={cheeses} />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la sélection
        </Link>
      </div>

      {/* Hero detail */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 sm:py-10 md:grid-cols-5 md:gap-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative md:col-span-2"
        >
          <div className="absolute -inset-4 rounded-2xl bg-[var(--gradient-warm)] opacity-20 blur-2xl" />
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-secondary/30 shadow-[var(--shadow-elegant)] ring-1 ring-border">
            <img
              src={image}
              srcSet={hasRealPhoto ? cheese.imageSrcSet : undefined}
              sizes="(max-width: 768px) 100vw, 40vw"
              alt={cheese.name}
              width={1600}
              height={1600}
              className={`h-full w-full ${hasRealPhoto ? "object-contain p-6" : "object-cover"}`}
            />
            <span className="absolute right-5 top-5 text-4xl drop-shadow-lg">{cheese.emoji}</span>
            {cheese.ref != null && (
              <span className="absolute left-5 top-5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
                Réf. {cheese.ref}
              </span>
            )}
            {isRoseCampoDui && (
              <img
                src={roseCampoDui.url}
                alt="Rose-Campo-Dui"
                className="absolute bottom-3 right-3 h-16 w-16 rounded-full ring-2 ring-primary/40 shadow-lg sm:bottom-4 sm:right-4 sm:h-24 sm:w-24"
              />
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col md:col-span-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            {cheese.category && <Badge variant="secondary">{cheese.category}</Badge>}
            {cheese.milk && <Badge variant="outline">{cheese.milk}</Badge>}
            {cheese.fabrication && <Badge variant="outline">{cheese.fabrication}</Badge>}
            {cheese.stock != null && (
              <Badge className={cheese.stock > 0 ? "bg-accent text-accent-foreground hover:bg-accent" : "bg-muted text-muted-foreground"}>
                {cheese.stock > 0 ? `${cheese.stock} en stock` : "Épuisé"}
              </Badge>
            )}
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.1] sm:text-5xl md:text-6xl md:leading-[1.05]">
            {cheese.name}
          </h1>
          {(cheese.fabriquant || origin) && (
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {[cheese.fabriquant, origin].filter(Boolean).join(" · ")}
            </p>
          )}
          {cheese.typeDesc && (
            <p className="mt-4 text-base leading-relaxed text-foreground/90 sm:mt-6 sm:text-lg">
              {cheese.typeDesc}
            </p>
          )}
          {cheese.saveur && (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              {cheese.saveur}
            </p>
          )}

          <div className="mt-6 grid gap-x-6 rounded-xl border border-border bg-card p-3 sm:mt-8 sm:grid-cols-2">
            {cheese.age && <StatRow icon={Clock} label="Affinage" value={cheese.age} />}
            {cheese.milk && <StatRow icon={Droplet} label="Lait" value={cheese.milk} />}
            {cheese.weight && <StatRow icon={Wheat} label="Poids pièce" value={cheese.weight} />}
            {cheese.fabrication && <StatRow icon={Factory} label="Fabrication" value={cheese.fabrication} />}
            {cheese.category && <StatRow icon={Package} label="Type de pâte" value={cheese.category} />}
            {cheese.matiereGrasse && <StatRow icon={Percent} label="Matière grasse" value={cheese.matiereGrasse} />}
            {cheese.fabriquant && <StatRow icon={Building2} label="Fabriquant" value={cheese.fabriquant} />}
            {origin && <StatRow icon={MapPin} label="Origine" value={origin} />}
            {cheese.season && <StatRow icon={Leaf} label="Saisonnalité" value={cheese.season} />}
            {cheese.colissage != null && (
              <StatRow icon={Hash} label="Colissage" value={String(cheese.colissage)} />
            )}
            {cheese.nombrePoidsReel != null && (
              <StatRow
                icon={Wheat}
                label={cheese.packagingUnit?.toLowerCase().startsWith("kg") ? "Poids réel" : "Nombre réel"}
                value={`${cheese.nombrePoidsReel}${cheese.packagingUnit?.toLowerCase().startsWith("kg") ? " kg" : ""}`}
              />
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 sm:mt-8 sm:p-5">
            <div>
              <p className="font-display text-2xl font-semibold sm:text-3xl">{cheese.priceLabel}</p>
              <p className="text-xs text-muted-foreground">
                {cheese.unit}
                {cheese.pricePerKg > 0 && ` · ${cheese.pricePerKg.toFixed(2)} € l'article`}
              </p>
            </div>
            <Button
              size="lg"
              disabled={soldOut}
              onClick={() => { add(cheese); setOpen(true); }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> {soldOut ? "Épuisé" : "Ajouter au panier"}
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Réservation en ligne
          </p>
        </motion.div>
      </section>

      {cheese.conseils && (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary">
              <Lightbulb className="h-4 w-4" /> Conseils du fromager
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl md:text-4xl">Comment le déguster</h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              {cheese.conseils}
            </p>
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-3 py-10 sm:px-6 sm:py-16">
            <h2 className="mb-6 font-display text-2xl font-semibold sm:mb-8 sm:text-3xl">À découvrir aussi</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {related.map((c: Cheese, i: number) => (
                <CheeseCard key={c.id} cheese={c} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tasie Fromages
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold">{cheese.priceLabel}</p>
            <p className="text-[10px] text-muted-foreground">{cheese.unit}</p>
          </div>
          <Button
            size="lg"
            disabled={soldOut}
            onClick={() => { add(cheese); setOpen(true); }}
            className="gap-2 px-6"
          >
            <Plus className="h-4 w-4" /> {soldOut ? "Épuisé" : "Commander"}
          </Button>
        </div>
      </div>
    </div>
  );
}