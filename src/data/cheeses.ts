import presseImg from "@/assets/cat-presse.jpg";
import molleImg from "@/assets/cat-molle.jpg";
import persilleeImg from "@/assets/cat-persillee.jpg";
import chevreImg from "@/assets/cat-chevre.jpg";
import fraisImg from "@/assets/cat-frais.jpg";

export interface Cheese {
  id: string;
  name: string;
  region?: string;
  category?: string;
  milk?: string;
  pricePerKg: number;
  priceLabel: string;
  unit: string;
  weight?: string;
  age?: string;
  description?: string;
  emoji: string;
  fabrication?: string;
  saveur?: string;
  season?: string;
  producer?: string;
  conseils?: string;
  stock?: number;
  ref?: number;
  typeDesc?: string;
  fabriquant?: string;
  ville?: string;
  department?: string;
  matiereGrasse?: string;
  colissage?: number;
  nombrePoidsReel?: number;
  imageUrl?: string;
  imageSrcSet?: string;
  packagingUnit?: string;
}

const FALLBACK_IMG = presseImg;

/**
 * pricePerKg (colonne N des fichiers Excel) contient le PRIX DU COLIS (article).
 * Le prix à la pièce = prix du colis / nombre de pièces par colis (colonne P).
 */
export function piecePrice(cheese: Pick<Cheese, "pricePerKg" | "colissage">): number {
  const pack = cheese.colissage ?? 0;
  if (pack > 1) return cheese.pricePerKg / pack;
  return cheese.pricePerKg;
}

export function formatEuro(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} €`;
}

/** Nombre de pièces par colis, uniquement si le colis regroupe plusieurs pièces. */
export function packSize(cheese: Pick<Cheese, "colissage">): number | null {
  const pack = cheese.colissage ?? 0;
  return pack > 1 ? pack : null;
}

/** Libellé du prix du colis / de l'article (prix facturé). */
export function packPriceLabel(cheese: Pick<Cheese, "pricePerKg" | "colissage">): string {
  const pack = packSize(cheese);
  return pack
    ? `${formatEuro(cheese.pricePerKg)} / colis de ${pack} pièces`
    : `${formatEuro(cheese.pricePerKg)} / article`;
}

/** Libellé du prix unitaire (à la pièce). */
export function piecePriceLabel(cheese: Pick<Cheese, "pricePerKg" | "colissage">): string {
  return `${formatEuro(piecePrice(cheese))} / pièce`;
}

export function getCategoryImage(category?: string, milk?: string): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("persill")) return persilleeImg;
  if (c.includes("molle")) return molleImg;
  if (c.includes("press")) return presseImg;
  if (c.includes("frais")) return fraisImg;
  if (c.includes("chèvre") || c.includes("chevre")) return chevreImg;
  const m = (milk ?? "").toLowerCase();
  if (m.includes("chevre") || m.includes("chèvre")) return chevreImg;
  return FALLBACK_IMG;
}

export function getCheeseEmoji(milk?: string): string {
  const m = (milk ?? "").toLowerCase();
  if (m.includes("chevre") || m.includes("chèvre")) return "🐐";
  if (m.includes("brebis")) return "🐑";
  if (m.includes("vache")) return "🐄";
  if (m.includes("bufflonne")) return "🐃";
  return "🧀";
}