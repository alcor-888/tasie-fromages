import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, MapPin, Clock, Droplet, Flame, Wine, Wheat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cheeses, categoryImage, type Cheese } from "@/data/cheeses";
import { CheeseCard } from "@/components/cheese-card";
import { useCart } from "@/lib/cart-store";

export const Route = createFileRoute("/fromage/$id")({
  loader: ({ params }) => {
    const cheese = cheeses.find((c) => c.id === params.id);
    if (!cheese) throw notFound();
    return { cheese };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.cheese;
    if (!c) return { meta: [{ title: "Fromage introuvable" }] };
    const title = `${c.name} — ${c.region} · La Cave Fromagère`;
    const desc = `${c.description} Affiné ${c.age}. Lait ${c.milk.toLowerCase()}.`;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: categoryImage[c.category] },
        { name: "twitter:image", content: categoryImage[c.category] },
      ],
    };
  },
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

function IntensityScale({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2 w-6 rounded-full ${n <= value ? "bg-primary" : "bg-border"}`}
        />
      ))}
    </div>
  );
}

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
  const { cheese } = Route.useLoaderData();
  const { add, setOpen, count } = useCart();
  const related = cheeses.filter((c) => c.category === cheese.category && c.id !== cheese.id).slice(0, 3);

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
            src={categoryImage[cheese.category]}
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
            <Badge variant="secondary">{cheese.category}</Badge>
            {cheese.rawMilk && <Badge className="bg-accent text-accent-foreground hover:bg-accent">Lait cru</Badge>}
            <Badge variant="outline">{cheese.milk}</Badge>
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
            {cheese.name}
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {cheese.region} · {cheese.producer}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {cheese.description}
          </p>

          <div className="mt-8 rounded-lg border border-border bg-card p-2">
            <StatRow icon={Clock} label="Affinage" value={cheese.age} />
            <StatRow icon={Droplet} label="Lait" value={`${cheese.milk}${cheese.rawMilk ? " · cru" : " · pasteurisé"}`} />
            <StatRow icon={Sparkles} label="Croûte" value={cheese.rind} />
            <StatRow icon={MapPin} label="Origine" value={cheese.region} />
            <StatRow icon={Flame} label="Intensité" value={<IntensityScale value={cheese.intensity} />} />
          </div>

          <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-card p-5">
            <div>
              <p className="font-display text-3xl font-semibold">{cheese.pricePerKg}€</p>
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

      {/* Tasting notes + pairings */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Notes de dégustation</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">En bouche</h2>
            <p className="mt-4 text-muted-foreground">Texture : {cheese.texture.toLowerCase()}.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {cheese.tastingNotes.map((n) => (
                <span key={n} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Accords</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">À marier avec</h2>
            <dl className="mt-6 space-y-5">
              <div className="flex gap-4">
                <Wine className="mt-1 h-5 w-5 flex-none text-primary" />
                <div>
                  <dt className="text-sm font-medium">Vins</dt>
                  <dd className="text-muted-foreground">{cheese.pairings.wines.join(" · ")}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <Wheat className="mt-1 h-5 w-5 flex-none text-primary" />
                <div>
                  <dt className="text-sm font-medium">Pains</dt>
                  <dd className="text-muted-foreground">{cheese.pairings.breads.join(" · ")}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <Sparkles className="mt-1 h-5 w-5 flex-none text-primary" />
                <div>
                  <dt className="text-sm font-medium">Accompagnements</dt>
                  <dd className="text-muted-foreground">{cheese.pairings.accompaniments.join(" · ")}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Histoire</p>
          <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">L'histoire derrière la croûte</h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{cheese.story}</p>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <h2 className="mb-8 font-display text-3xl font-semibold">Dans la même famille</h2>
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