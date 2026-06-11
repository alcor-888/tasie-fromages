import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-store";
import type { Cheese } from "@/data/cheeses";

export function CheeseCard({ cheese, index }: { cheese: Cheese; index: number }) {
  const { add, setOpen } = useCart();
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.05 }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-[var(--shadow-elegant)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--gradient-warm)]">
        <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-90 transition-transform duration-700 group-hover:scale-110">
          {cheese.emoji}
        </div>
        <Badge className="absolute left-3 top-3 bg-card text-card-foreground hover:bg-card">
          {cheese.category}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-xl font-semibold leading-tight">{cheese.name}</h3>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {cheese.region} · {cheese.milk} · {cheese.age}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {cheese.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="font-display">
            <span className="text-2xl font-semibold">{cheese.pricePerKg}€</span>
            <span className="ml-1 text-xs text-muted-foreground">{cheese.unit}</span>
          </div>
          <Button
            size="sm"
            onClick={() => { add(cheese); setOpen(true); }}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>
    </motion.article>
  );
}