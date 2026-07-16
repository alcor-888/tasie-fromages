import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromoBadge } from "@/components/promo-badge";
import { useCart } from "@/lib/cart-store";
import { getCategoryImage, type Cheese } from "@/data/cheeses";

export function CheeseCard({ cheese, index, promotion }: { cheese: Cheese; index: number; promotion?: boolean }) {
  const { add, setOpen } = useCart();
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.05 }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] hover:border-primary/30"
    >
      <Link
        to="/fromage/$id"
        params={{ id: cheese.id }}
        className="relative block aspect-[4/3] overflow-hidden"
      >
        <img
          src={cheese.imageUrl || getCategoryImage(cheese.category, cheese.milk)}
          alt={cheese.name}
          loading="lazy"
          width={1600}
          height={1100}
          className={`h-full w-full transition-transform duration-700 group-hover:scale-105 ${cheese.imageUrl ? "object-contain bg-secondary/40" : "object-cover"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {promotion && <PromoBadge className="absolute left-3 top-3" />}
        {!promotion && cheese.category && (
          <Badge className="absolute left-2 top-2 bg-card/95 text-card-foreground text-[10px] px-2 py-0.5 hover:bg-card">
            {cheese.category}
          </Badge>
        )}
        <span className="absolute right-2 top-2 text-lg drop-shadow">{cheese.emoji}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          to="/fromage/$id"
          params={{ id: cheese.id }}
          className="after:absolute after:inset-0 after:content-[''] hover:text-primary transition-colors"
        >
          <h3 className="font-display text-[15px] font-semibold leading-tight line-clamp-2">{cheese.name}</h3>
        </Link>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground line-clamp-1">
          {[cheese.region, cheese.milk, cheese.age].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="font-display leading-none">
            <span className="text-lg font-semibold">{cheese.priceLabel}</span>
            <span className="ml-1 text-[10px] text-muted-foreground">{cheese.unit}</span>
          </div>
          <Button
            size="sm"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); add(cheese); setOpen(true); }}
            className="relative z-10 h-8 gap-1 px-2.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
      </div>
    </motion.article>
  );
}