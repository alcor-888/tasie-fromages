import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, MapPin, Clock, Droplet, Wheat, Factory, Leaf, Lightbulb, Check, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryImage, type Cheese } from "@/data/cheeses";
import { listCheeses } from "@/lib/cheeses.functions";
import { CheeseCard } from "@/components/cheese-card";

const cheesesQuery = queryOptions({
  queryKey: ["cheeses"],
  queryFn: () => listCheeses(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/fromage/$id")({
  loader: ({ context }) => context.queryClient.ensureQueryData(cheesesQuery),
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
  const cheese = cheeses.find((c: Cheese) => c.id === id);
  if (!cheese) throw notFound();
  const { add, setOpen, count } = useCart();
  const related = cheeses
    .filter((c: Cheese) => c.id !== cheese.id && (c.category === cheese.category || c.milk === cheese.milk))
    .slice(0, 3);
  const image = getCategoryImage(cheese.category, cheese.milk);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold">La Cave</span>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Fromagère</span>
          </Link>
          <Button size="sm" onClick={() => setOpen(true)}>
            Panier{count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la sélection
        </Link>
      </div>

      {/* Hero detail */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-10 md:grid-cols-2 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-2xl bg-[var(--gradient-warm)] opacity-20 blur-2xl" />
          <img
            src={image}
            alt={cheese.name}
            width={1600}
            height={1100}
            className="relative aspect-[4/5] w-full rounded-xl object-cover shadow-[var(--shadow-elegant)] md:aspect-[4/5]"
          />
          <span className="absolute right-6 top-6 text-5xl drop-shadow-lg">{cheese.emoji}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col"
        >
          <div className="flex flex-wrap items-center gap-2">
            {cheese.category && <Badge variant="secondary">{cheese.category}</Badge>}
            {cheese.milk && <Badge variant="outline">{cheese.milk}</Badge>}
            {cheese.stock != null && (
              <Badge className={cheese.stock > 0 ? "bg-accent text-accent-foreground hover:bg-accent" : "bg-muted text-muted-foreground"}>
                {cheese.stock > 0 ? `${cheese.stock} en stock` : "Épuisé"}
              </Badge>
            )}
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
            {cheese.name}
          </h1>
          {(cheese.region || cheese.producer) && (
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {[cheese.region, cheese.producer].filter(Boolean).join(" · ")}
            </p>
          )}
          {cheese.saveur && (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {cheese.saveur}
            </p>
          )}

          <div className="mt-8 rounded-lg border border-border bg-card p-2">
            {cheese.age && <StatRow icon={Clock} label="Affinage" value={cheese.age} />}
            {cheese.milk && <StatRow icon={Droplet} label="Lait" value={cheese.milk} />}
            {cheese.weight && <StatRow icon={Wheat} label="Poids" value={cheese.weight} />}
            {cheese.fabrication && <StatRow icon={Factory} label="Fabrication" value={cheese.fabrication} />}
            {cheese.season && <StatRow icon={Leaf} label="Saisonnalité" value={cheese.season} />}
            {cheese.region && <StatRow icon={MapPin} label="Origine" value={cheese.region} />}
          </div>

          <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-card p-5">
            <div>
              <p className="font-display text-3xl font-semibold">{cheese.priceLabel}</p>
              <p className="text-xs text-muted-foreground">{cheese.unit}</p>
            </div>
            <Button size="lg" onClick={() => { add(cheese); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter au panier
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Réservation en ligne · paiement et retrait en boutique
          </p>
        </motion.div>
      </section>

      {cheese.conseils && (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary">
              <Lightbulb className="h-4 w-4" /> Conseils du fromager
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Comment le déguster</h2>
            <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {cheese.conseils}
            </p>
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <h2 className="mb-8 font-display text-3xl font-semibold">À découvrir aussi</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c: Cheese, i: number) => (
                <CheeseCard key={c.id} cheese={c} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} La Cave Fromagère
      </footer>
    </div>
  );
}