import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromoBadgeProps {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Eye-catching promotional badge with a hot gradient, animated pulse ring,
 * and diagonal sheen sweep. Uses semantic promo tokens defined in styles.css.
 */
export function PromoBadge({ label = "PROMO", className, size = "md" }: PromoBadgeProps) {
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  } as const;

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Pulsing halo */}
      <span
        aria-hidden
        className="promo-badge pointer-events-none absolute inset-0 rounded-full"
        style={{ background: "var(--gradient-promo)" }}
      />
      {/* Solid pill */}
      <span
        className={cn(
          "relative inline-flex items-center overflow-hidden rounded-full font-display font-bold uppercase tracking-[0.18em] text-[color:var(--promo-foreground)]",
          "shadow-[var(--shadow-promo)] ring-1 ring-white/25",
          sizes[size],
        )}
        style={{ background: "var(--gradient-promo)" }}
      >
        <Sparkles className="h-3 w-3 drop-shadow" strokeWidth={2.5} />
        <span className="relative z-10">{label}</span>
        {/* Diagonal sheen sweep */}
        <span
          aria-hidden
          className="promo-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-overlay"
        />
      </span>
    </div>
  );
}
