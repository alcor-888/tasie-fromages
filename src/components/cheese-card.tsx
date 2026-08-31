import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromoBadge } from "@/components/promo-badge";
import { useCart } from "@/lib/cart-store";
import { getCategoryImage, formatEuro, packQuantityLabel, unitPriceLabel, type Cheese } from "@/data/cheeses";

export function CheeseCard({ cheese, index, promotion }: { cheese: Cheese; index: number; promotion?: boolean }) {
  const { add, setOpen } = useCart();
  const [loaded, setLoaded] = useState(false);
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
        <div
          aria-hidden
          className={`absolute inset-0 bg-gradient-to-br from-secondary/60 to-muted animate-pulse transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
        />
        <img
          src={cheese.imageUrl || getCategoryImage(cheese.category, cheese.milk)}
          srcSet={cheese.imageSrcSet}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          alt={cheese.name}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onLoad={() => setLoaded(true)}
          width={1600}
          height={1100}
          className={`h-full w-full transition-all duration-700 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"} ${cheese.imageUrl ? "object-contain bg-secondary/40" : "object-cover"}`}
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
      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:gap-1.5 sm:p-3">
        <Link
          to="/fromage/$id"
          params={{ id: cheese.id }}
          className="after:absolute after:inset-0 after:content-[''] hover:text-primary transition-colors"
        >
          <h3 className="font-display text-sm font-semibold leading-tight line-clamp-2 sm:text-[15px]">{cheese.name}</h3>
        </Link>
        {(cheese.fabriquant || cheese.region) && (
          <p className="text-[10px] font-medium text-foreground/80 line-clamp-1 sm:text-[11px]">
            {[cheese.fabriquant, cheese.region].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground line-clamp-1 sm:text-[10px]">
          {[cheese.milk, cheese.age].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-1 pt-2">
          <div className="font-display leading-tight">
            {cheese.pricePerKg > 0 && (
              <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                {unitPriceLabel(cheese)}
              </p>
            )}
            <p className="text-base font-bold sm:text-lg">
              {formatEuro(cheese.pricePerKg)}
              <span className="ml-1 text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                {packQuantityLabel(cheese) ? `le colis de ${packQuantityLabel(cheese)}` : "l'article"}
              </span>
            </p>
          </div>

          <Button
            size="sm"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); add(cheese); setOpen(true); }}
            className="relative z-10 h-8 gap-1 px-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ajouter</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}